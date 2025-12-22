extends CanvasLayer
class_name DialogChoices

@onready var choices_container: VBoxContainer = $ChoicesControl/ChoicesContainer
@onready var choices_control: Control = $ChoicesControl

var _choice_buttons: Array[Button] = []


func _ready() -> void:
	choices_control.visible = false
	DialogManager.choices_shown.connect(_on_choices_shown)
	DialogManager.dialog_ended.connect(_on_dialog_ended)


func _on_choices_shown(choices: Array) -> void:
	_clear_choices()
	
	for i in range(choices.size()):
		var choice: Dictionary = choices[i]
		var button := Button.new()
		button.text = choice.get("text", "...")
		button.custom_minimum_size = Vector2(0, 80)
		button.mouse_filter = Control.MOUSE_FILTER_STOP
		button.focus_mode = Control.FOCUS_ALL
		
		# Style the button
		button.add_theme_font_size_override("font_size", 22)
		button.add_theme_color_override("font_color", Color(1, 1, 1))
		button.add_theme_color_override("font_hover_color", Color(1, 0.9, 0.6))
		button.add_theme_color_override("font_pressed_color", Color(0.9, 0.8, 0.5))
		
		# Create styles for the button
		var style_normal := _create_button_style(Color(0.2, 0.2, 0.25, 0.95), Color(0.9, 0.8, 0.5, 1))
		var style_hover := _create_button_style(Color(0.3, 0.3, 0.35, 0.95), Color(1, 0.9, 0.6, 1))
		var style_pressed := _create_button_style(Color(0.15, 0.15, 0.2, 0.95), Color(0.9, 0.8, 0.5, 1))
		
		button.add_theme_stylebox_override("normal", style_normal)
		button.add_theme_stylebox_override("hover", style_hover)
		button.add_theme_stylebox_override("pressed", style_pressed)
		
		var idx := i
		button.pressed.connect(_make_choice_callback(idx))
		
		choices_container.add_child(button)
		_choice_buttons.append(button)
	
	choices_control.visible = true
	
	# Focus first button
	if _choice_buttons.size() > 0:
		await get_tree().process_frame
		_choice_buttons[0].grab_focus()


func _make_choice_callback(index: int) -> Callable:
	return func(): _on_choice_pressed(index)


func _create_button_style(bg_color: Color, border_color: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = bg_color
	style.set_border_width_all(2)
	style.border_color = border_color
	style.set_corner_radius_all(12)
	style.set_content_margin_all(16)
	return style


func _on_choice_pressed(index: int) -> void:
	choices_control.visible = false
	DialogManager.select_choice(index)
	_clear_choices()


func _on_dialog_ended() -> void:
	choices_control.visible = false
	_clear_choices()


func _clear_choices() -> void:
	for button in _choice_buttons:
		button.queue_free()
	_choice_buttons.clear()
