extends CanvasLayer
class_name DialogBox

@onready var panel: PanelContainer = $Panel
@onready var speaker_label: Label = $Panel/MarginContainer/VBoxContainer/SpeakerLabel
@onready var text_label: Label = $Panel/MarginContainer/VBoxContainer/TextLabel
@onready var continue_indicator: Label = $Panel/MarginContainer/VBoxContainer/ContinueIndicator

## Characters per second for typewriter effect
@export var text_speed: float = 40.0

var _full_text: String = ""
var _displayed_chars: float = 0.0
var _is_typing: bool = false


func _ready() -> void:
	hide_dialog()
	DialogManager.dialog_started.connect(_on_dialog_started)
	DialogManager.dialog_ended.connect(_on_dialog_ended)
	DialogManager.dialog_line_shown.connect(_on_dialog_line_shown)


func _process(delta: float) -> void:
	if _is_typing:
		_displayed_chars += text_speed * delta
		var chars_to_show := int(_displayed_chars)
		
		if chars_to_show >= _full_text.length():
			text_label.text = _full_text
			_is_typing = false
			continue_indicator.visible = true
		else:
			text_label.text = _full_text.substr(0, chars_to_show)


func _unhandled_input(event: InputEvent) -> void:
	if not panel.visible:
		return
	
	if event.is_action_pressed("interact"):
		if _is_typing:
			# Skip to full text
			_is_typing = false
			text_label.text = _full_text
			continue_indicator.visible = true
		else:
			# Advance to next line
			DialogManager.advance_dialog()
		
		get_viewport().set_input_as_handled()


func show_dialog() -> void:
	panel.visible = true


func hide_dialog() -> void:
	panel.visible = false
	continue_indicator.visible = false


func _on_dialog_started() -> void:
	show_dialog()


func _on_dialog_ended() -> void:
	hide_dialog()


func _on_dialog_line_shown(speaker: String, text: String) -> void:
	speaker_label.text = speaker
	_full_text = text
	_displayed_chars = 0.0
	text_label.text = ""
	_is_typing = true
	continue_indicator.visible = false
