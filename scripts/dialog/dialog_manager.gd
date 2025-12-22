extends Node

signal dialog_started
signal dialog_ended
signal dialog_line_shown(speaker: String, text: String)
signal choices_shown(choices: Array)
signal choice_selected(choice_index: int)

var is_dialog_active: bool = false
var _current_lines: Array = []  # Can be String or Dictionary for choices
var _current_speaker: String = ""
var _current_index: int = 0
var _waiting_for_choice: bool = false
var _choice_callback: Callable


func start_dialog(speaker: String, lines: Array) -> void:
	if lines.size() == 0:
		return
	
	is_dialog_active = true
	_current_speaker = speaker
	_current_lines = lines
	_current_index = 0
	_waiting_for_choice = false
	
	dialog_started.emit()
	_show_current_line()


func advance_dialog() -> void:
	if not is_dialog_active or _waiting_for_choice:
		return
	
	_current_index += 1
	
	if _current_index >= _current_lines.size():
		end_dialog()
	else:
		_show_current_line()


func select_choice(choice_index: int) -> void:
	if not _waiting_for_choice:
		return
	
	_waiting_for_choice = false
	choice_selected.emit(choice_index)
	
	if _choice_callback.is_valid():
		_choice_callback.call(choice_index)


func end_dialog() -> void:
	is_dialog_active = false
	_current_lines = []
	_current_speaker = ""
	_current_index = 0
	_waiting_for_choice = false
	dialog_ended.emit()


func _show_current_line() -> void:
	if _current_index >= _current_lines.size():
		return
	
	var line = _current_lines[_current_index]
	
	if line is String:
		dialog_line_shown.emit(_current_speaker, line)
	elif line is Dictionary:
		if line.has("choices"):
			# This is a choice prompt
			dialog_line_shown.emit(line.get("speaker", _current_speaker), line.get("text", ""))
			_waiting_for_choice = true
			_choice_callback = line.get("callback", Callable())
			# Small delay before showing choices
			await get_tree().create_timer(0.5).timeout
			choices_shown.emit(line["choices"])
		else:
			# Regular line with custom speaker
			dialog_line_shown.emit(line.get("speaker", _current_speaker), line.get("text", ""))
