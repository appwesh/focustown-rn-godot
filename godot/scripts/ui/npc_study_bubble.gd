extends Node3D
class_name NPCStudyBubble

## 3D bubble that displays above NPCs showing their study timer and flag
## Uses SubViewport + Sprite3D with proper Godot UI elements

@export var height_offset: float = 1.8  ## Height above the NPC (above head)

## Country flag emojis
const FLAGS := ["🇺🇸", "🇬🇧", "🇯🇵", "🇳🇴", "🇫🇷", "🇩🇪", "🇰🇷", "🇧🇷", "🇮🇹", "🇪🇸", "🇨🇦", "🇦🇺"]

## Emoji font for cross-platform support
var _emoji_font: Font

## Timer state
var _total_seconds: int = 0
var _flag: String = ""
var _tick_timer: float = 0.0

## UI nodes
var _viewport: SubViewport
var _sprite: Sprite3D
var _timer_label: Label
var _flag_label: Label


func _ready() -> void:
	# Load emoji font
	_emoji_font = load("res://assets/fonts/NotoColorEmoji.ttf")
	
	# Defer setup to ensure everything is ready
	call_deferred("_setup_ui")
	call_deferred("_randomize_display")


func _process(delta: float) -> void:
	# Countdown timer
	_tick_timer += delta
	if _tick_timer >= 1.0:
		_tick_timer -= 1.0
		if _total_seconds > 0:
			_total_seconds -= 1
			_update_display()


func _setup_ui() -> void:
	# Create SubViewport - size matches our UI exactly
	_viewport = SubViewport.new()
	_viewport.size = Vector2i(180, 55)
	_viewport.transparent_bg = true
	_viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	_viewport.gui_disable_input = true
	add_child(_viewport)
	
	# Create pill background panel with explicit size
	var panel := Panel.new()
	panel.position = Vector2(0, 0)
	panel.size = Vector2(140, 55)
	panel.custom_minimum_size = Vector2(140, 55)
	
	# Style the panel as a rounded pill
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.98, 0.96, 0.92, 1.0)  # Cream white
	style.border_color = Color(0.82, 0.78, 0.72, 1.0)  # Tan border
	style.set_border_width_all(3)
	style.set_corner_radius_all(27)  # Rounded corners (about half the height)
	panel.add_theme_stylebox_override("panel", style)
	_viewport.add_child(panel)
	
	# Create HBoxContainer for timer + flag layout
	var hbox := HBoxContainer.new()
	hbox.position = Vector2(18, 8)
	hbox.size = Vector2(100, 40)
	hbox.alignment = BoxContainer.ALIGNMENT_CENTER
	hbox.add_theme_constant_override("separation", 12)
	panel.add_child(hbox)
	
	# Timer label
	_timer_label = Label.new()
	_timer_label.text = "00:00"
	_timer_label.add_theme_font_size_override("font_size", 26)
	_timer_label.add_theme_color_override("font_color", Color(0.3, 0.25, 0.2, 1.0))
	_timer_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_timer_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	hbox.add_child(_timer_label)
	
	# Flag label with emoji font
	_flag_label = Label.new()
	_flag_label.text = "🇺🇸"
	if _emoji_font:
		_flag_label.add_theme_font_override("font", _emoji_font)
	_flag_label.add_theme_font_size_override("font_size", 24)
	_flag_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_flag_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	hbox.add_child(_flag_label)
	
	# Create Sprite3D to display the viewport in 3D
	_sprite = Sprite3D.new()
	_sprite.pixel_size = 0.005
	_sprite.position.y = height_offset
	_sprite.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	_sprite.no_depth_test = false
	_sprite.render_priority = 1
	_sprite.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR
	add_child(_sprite)
	
	# Wait a frame then assign texture
	await get_tree().process_frame
	_sprite.texture = _viewport.get_texture()


func _randomize_display() -> void:
	# Random time between 5:00 and 45:00
	var minutes := randi_range(5, 45)
	var seconds := randi_range(0, 59)
	_total_seconds = minutes * 60 + seconds
	
	# Random flag
	_flag = FLAGS[randi() % FLAGS.size()]
	
	_update_display()


func _update_display() -> void:
	if _timer_label:
		var minutes := _total_seconds / 60
		var seconds := _total_seconds % 60
		_timer_label.text = "%02d:%02d" % [minutes, seconds]
	
	if _flag_label:
		_flag_label.text = _flag


## Set a specific time to display
func set_time(minutes: int, seconds: int) -> void:
	_total_seconds = minutes * 60 + seconds
	_update_display()


## Set the flag emoji to display
func set_flag(flag: String) -> void:
	_flag = flag
	_update_display()
