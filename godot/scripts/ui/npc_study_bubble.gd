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

## Animation
var _anim_tween: Tween
const ANIM_DURATION := 0.35
const SLIDE_OFFSET := 0.15  ## How far to slide up/down


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
	# Create SubViewport - render at 2x resolution for sharper quality
	_viewport = SubViewport.new()
	_viewport.size = Vector2i(260, 110)
	_viewport.transparent_bg = true
	_viewport.render_target_update_mode = SubViewport.UPDATE_ONCE
	_viewport.gui_disable_input = true
	add_child(_viewport)
	
	# Create pill background panel with explicit size (2x scale)
	var panel := Panel.new()
	panel.position = Vector2(0, 0)
	panel.size = Vector2(260, 110)
	panel.custom_minimum_size = Vector2(260, 110)
	
	# Style the panel as a rounded pill
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.98, 0.96, 0.92, 0.75)  # Cream white, slightly transparent
	style.set_corner_radius_all(54)  # Rounded corners (about half the height)
	panel.add_theme_stylebox_override("panel", style)
	_viewport.add_child(panel)
	
	# Create HBoxContainer for timer + flag layout (2x scale)
	var hbox := HBoxContainer.new()
	hbox.position = Vector2(36, 16)
	hbox.size = Vector2(160, 80)
	hbox.alignment = BoxContainer.ALIGNMENT_CENTER
	hbox.add_theme_constant_override("separation", 24)
	panel.add_child(hbox)
	
	# Timer label (2x font size for 2x resolution)
	_timer_label = Label.new()
	_timer_label.text = "00:00"
	_timer_label.add_theme_font_size_override("font_size", 52)
	_timer_label.add_theme_color_override("font_color", Color(0.3, 0.25, 0.2, 1.0))
	# Simulate bold with outline
	_timer_label.add_theme_constant_override("outline_size", 6)
	_timer_label.add_theme_color_override("font_outline_color", Color(0.3, 0.25, 0.2, 1.0))
	_timer_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_timer_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	hbox.add_child(_timer_label)
	
	# Flag label with emoji font (2x font size)
	_flag_label = Label.new()
	_flag_label.text = "🇺🇸"
	if _emoji_font:
		_flag_label.add_theme_font_override("font", _emoji_font)
	_flag_label.add_theme_font_size_override("font_size", 64)
	_flag_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_flag_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	hbox.add_child(_flag_label)
	
	# Create Sprite3D to display the viewport in 3D
	_sprite = Sprite3D.new()
	_sprite.pixel_size = 0.0025  # Halved for 2x resolution
	_sprite.position.y = height_offset
	_sprite.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	_sprite.shaded = false  # Don't apply scene lighting - keeps colors true
	_sprite.no_depth_test = true  # Always render on top of scene geometry
	_sprite.render_priority = 10  # Higher priority for UI elements
	_sprite.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR
	_sprite.alpha_cut = SpriteBase3D.ALPHA_CUT_DISABLED  # Support non-binary transparency
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
	# Trigger a single viewport re-render since we use UPDATE_ONCE
	if _viewport:
		_viewport.render_target_update_mode = SubViewport.UPDATE_ONCE
	
	if _timer_label:
		var total_minutes := _total_seconds / 60
		var hours := total_minutes / 60
		var minutes := total_minutes % 60
		
		if hours > 0:
			# Format as "1h24" for times over an hour
			_timer_label.text = "%dh%02d" % [hours, minutes]
		else:
			# Format as "12m" for times under an hour
			_timer_label.text = "%dm" % minutes
	
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


## Animate the bubble appearing (slide up + fade in)
func animate_show() -> void:
	if not _sprite:
		visible = true
		return
	
	# Cancel any existing animation
	if _anim_tween and _anim_tween.is_valid():
		_anim_tween.kill()
	
	# Start below final position and transparent
	_sprite.position.y = height_offset - SLIDE_OFFSET
	_sprite.modulate.a = 0.0
	visible = true
	
	# Animate to final position
	_anim_tween = create_tween()
	_anim_tween.set_ease(Tween.EASE_OUT)
	_anim_tween.set_trans(Tween.TRANS_BACK)
	_anim_tween.set_parallel(true)
	_anim_tween.tween_property(_sprite, "position:y", height_offset, ANIM_DURATION)
	_anim_tween.tween_property(_sprite, "modulate:a", 1.0, ANIM_DURATION * 0.7)


## Animate the bubble disappearing (slide down + fade out)
func animate_hide() -> void:
	if not _sprite:
		visible = false
		return
	
	# Cancel any existing animation
	if _anim_tween and _anim_tween.is_valid():
		_anim_tween.kill()
	
	# Animate down and fade out
	_anim_tween = create_tween()
	_anim_tween.set_ease(Tween.EASE_IN)
	_anim_tween.set_trans(Tween.TRANS_QUAD)
	_anim_tween.set_parallel(true)
	_anim_tween.tween_property(_sprite, "position:y", height_offset - SLIDE_OFFSET, ANIM_DURATION)
	_anim_tween.tween_property(_sprite, "modulate:a", 0.0, ANIM_DURATION * 0.7)
	
	# Hide after animation completes
	_anim_tween.chain().tween_callback(func(): visible = false)
