extends Node

signal dialog_started
signal dialog_ended
signal dialog_line_shown(speaker: String, text: String)

var is_dialog_active: bool = false
var _current_lines: Array[String] = []
var _current_speaker: String = ""
var _current_index: int = 0


func start_dialog(speaker: String, lines: Array[String]) -> void:
	if lines.size() == 0:
		return
	
	is_dialog_active = true
	_current_speaker = speaker
	_current_lines = lines
	_current_index = 0
	
	dialog_started.emit()
	_show_current_line()


func advance_dialog() -> void:
	if not is_dialog_active:
		return
	
	_current_index += 1
	
	if _current_index >= _current_lines.size():
		end_dialog()
	else:
		_show_current_line()


func end_dialog() -> void:
	is_dialog_active = false
	_current_lines = []
	_current_speaker = ""
	_current_index = 0
	dialog_ended.emit()


func _show_current_line() -> void:
	if _current_index < _current_lines.size():
		dialog_line_shown.emit(_current_speaker, _current_lines[_current_index])

