extends Node3D
class_name CinematicCharacter

## A reusable character controller for cinematic scenes
## Wraps ModularCharacter with preset loading and animation state management
##
## Usage:
##   1. Instance this scene
##   2. Call apply_preset() with a CharacterPreset resource or dictionary
##   3. Use play_animation() or transition_to_animation() for animations
##   4. Use move_to() for click-to-move functionality

signal animation_started(animation_name: String)
signal animation_finished(animation_name: String)
signal preset_applied(preset_name: String)
signal movement_started(target: Vector3)
signal movement_finished
signal arrived_at_destination

## Character preset to apply on ready (can be set in editor or code)
@export var initial_preset: CharacterPreset

## Default animation to play after spawning
@export var default_animation: String = "Idle_F"

## Animation transition duration in seconds
@export var transition_duration: float = 0.25

## Whether to auto-play default animation on ready
@export var auto_play: bool = true

@export_group("Movement")
## Movement speed in units per second
@export var move_speed: float = 2.0

## How close to target before stopping
@export var arrival_threshold: float = 0.1

## Rotation speed for turning (degrees per second)
@export var rotation_speed: float = 720.0

## Walk animation name
@export var walk_animation: String = "Walk_F"

var _modular_character: ModularCharacter
var _current_animation: String = ""
var _anim_player: AnimationPlayer

## Movement state
var _target_position: Vector3 = Vector3.INF
var _is_moving: bool = false


func _ready() -> void:
	_setup_character()
	
	if initial_preset:
		apply_preset(initial_preset)
	
	if auto_play and not default_animation.is_empty():
		# Wait a frame for character to fully initialize
		await get_tree().process_frame
		play_animation(default_animation)


func _physics_process(delta: float) -> void:
	if _is_moving:
		_process_movement(delta)


func _setup_character() -> void:
	# Create ModularCharacter as child
	_modular_character = ModularCharacter.new()
	_modular_character.name = "ModularCharacter"
	add_child(_modular_character)
	
	# Connect to animation changes
	_modular_character.animation_changed.connect(_on_animation_changed)


## Apply a character preset (skin)
func apply_preset(preset: CharacterPreset) -> void:
	if not _modular_character:
		push_error("[CinematicCharacter] No modular character to apply preset to")
		return
	
	_modular_character.load_from_dict(preset.to_dict())
	preset_applied.emit(preset.preset_name)


## Apply preset from a dictionary (JSON-like data)
func apply_preset_dict(data: Dictionary, name: String = "Custom") -> void:
	var preset := CharacterPreset.create_from_dict(data, name)
	apply_preset(preset)


## Play an animation immediately (loops by default)
func play_animation(anim_name: String, loop: bool = true) -> void:
	if not _modular_character:
		return
	
	_modular_character.play_animation(anim_name)
	_current_animation = anim_name


## Transition smoothly to a new animation
func transition_to_animation(anim_name: String, duration: float = -1.0, loop: bool = true) -> void:
	if duration < 0:
		duration = transition_duration
	
	var anim_player := _modular_character.get_animation_player() if _modular_character else null
	if not anim_player:
		play_animation(anim_name, loop)
		return
	
	# Find the full animation name
	var full_anim_name := _find_animation_name(anim_name)
	if full_anim_name.is_empty():
		push_warning("[CinematicCharacter] Animation not found: %s" % anim_name)
		if _modular_character:
			print("[CinematicCharacter] Available animations: %s" % _modular_character.get_animation_list())
		return
	
	print("[CinematicCharacter] Playing animation: %s (searched: %s)" % [full_anim_name, anim_name])
	
	# Set loop mode on the animation - try multiple approaches
	var animation: Animation = null
	
	# Method 1: Try library/animation format
	var anim_parts := full_anim_name.split("/")
	if anim_parts.size() == 2:
		var lib := anim_player.get_animation_library(anim_parts[0])
		if lib:
			animation = lib.get_animation(anim_parts[1])
	
	# Method 2: Try getting animation directly from player
	if not animation and anim_player.has_animation(full_anim_name):
		animation = anim_player.get_animation(full_anim_name)
	
	# Set loop mode if we found the animation
	if animation:
		animation.loop_mode = Animation.LOOP_LINEAR if loop else Animation.LOOP_NONE
		print("[CinematicCharacter] Set loop mode for %s: %s" % [full_anim_name, "LINEAR" if loop else "NONE"])
	else:
		push_warning("[CinematicCharacter] Could not find animation resource to set loop: %s" % full_anim_name)
	
	# Cross-fade to new animation
	if duration > 0 and anim_player.current_animation != "":
		anim_player.play(full_anim_name, duration)
	else:
		anim_player.play(full_anim_name)
	
	# Debug: check animation length and track paths
	if animation:
		print("[CinematicCharacter] Animation length: %.2f seconds, tracks: %d" % [animation.length, animation.get_track_count()])
		# Print first few track paths to debug path mismatch
		for i in range(min(3, animation.get_track_count())):
			print("[CinematicCharacter]   Track %d: %s" % [i, animation.track_get_path(i)])
	
	_current_animation = anim_name
	animation_started.emit(anim_name)


## Play animation once (no loop), then return to default
func play_animation_once(anim_name: String, return_to: String = "") -> void:
	if return_to.is_empty():
		return_to = default_animation
	
	var anim_player := _modular_character.get_animation_player() if _modular_character else null
	if not anim_player:
		return
	var full_anim_name := _find_animation_name(anim_name)
	
	if full_anim_name.is_empty():
		return
	
	# Set animation to not loop
	var anim_parts := full_anim_name.split("/")
	if anim_parts.size() == 2:
		var lib := anim_player.get_animation_library(anim_parts[0])
		if lib:
			var animation := lib.get_animation(anim_parts[1])
			if animation:
				animation.loop_mode = Animation.LOOP_NONE
	
	anim_player.play(full_anim_name)
	_current_animation = anim_name
	animation_started.emit(anim_name)
	
	# Wait for animation to finish, then return to default
	await anim_player.animation_finished
	animation_finished.emit(anim_name)
	transition_to_animation(return_to)


## Queue multiple animations to play in sequence
func play_animation_sequence(animations: Array[String], loop_last: bool = true) -> void:
	for i in range(animations.size()):
		var anim := animations[i]
		var is_last := i == animations.size() - 1
		
		if is_last and loop_last:
			transition_to_animation(anim)
		else:
			await play_animation_once(anim, "")
			# Small delay between animations
			await get_tree().create_timer(0.1).timeout


## Get current animation name
func get_current_animation() -> String:
	return _current_animation


## Get list of all available animations
func get_available_animations() -> Array[String]:
	if _modular_character:
		return _modular_character.get_animation_list()
	return []


## Get animation categories for easier browsing
func get_animation_categories() -> Dictionary:
	if _modular_character:
		return _modular_character.get_animation_categories()
	return {}


## Get the underlying ModularCharacter for direct access if needed
func get_modular_character() -> ModularCharacter:
	return _modular_character


## Save current appearance to dictionary
func save_appearance() -> Dictionary:
	if _modular_character:
		return _modular_character.save_to_dict()
	return {}


## Randomize character appearance
func randomize_appearance() -> void:
	if _modular_character:
		_modular_character.randomize_appearance()


## Change a specific part
func set_part(category: String, index: int) -> void:
	if _modular_character:
		_modular_character.set_part(category, index)


func _find_animation_name(search_name: String) -> String:
	if not _modular_character:
		return ""
	
	var all_anims := _modular_character.get_animation_list()
	for anim in all_anims:
		if search_name.to_lower() in anim.to_lower():
			return anim
	return ""


func _on_animation_changed(anim_name: String) -> void:
	animation_started.emit(anim_name)


## ========== Movement ==========

## Move character to a target position
func move_to(target: Vector3) -> void:
	# Keep Y position (don't change height)
	_target_position = Vector3(target.x, position.y, target.z)
	
	if not _is_moving:
		_is_moving = true
		transition_to_animation(walk_animation)
		movement_started.emit(_target_position)


## Stop movement immediately
func stop_movement() -> void:
	if _is_moving:
		_is_moving = false
		_target_position = Vector3.INF
		transition_to_animation(default_animation)
		movement_finished.emit()


## Check if character is currently moving
func is_moving() -> bool:
	return _is_moving


## Get current target position (Vector3.INF if not moving)
func get_target_position() -> Vector3:
	return _target_position


func _process_movement(delta: float) -> void:
	if _target_position == Vector3.INF:
		stop_movement()
		return
	
	var current_pos := Vector3(position.x, position.y, position.z)
	var target_flat := Vector3(_target_position.x, position.y, _target_position.z)
	var direction := (target_flat - current_pos).normalized()
	var distance := current_pos.distance_to(target_flat)
	
	# Check if arrived
	if distance <= arrival_threshold:
		position = target_flat
		_is_moving = false
		_target_position = Vector3.INF
		transition_to_animation(default_animation)
		arrived_at_destination.emit()
		movement_finished.emit()
		return
	
	# Rotate towards target
	if direction.length() > 0.01:
		var target_angle := atan2(direction.x, direction.z)
		var current_angle := rotation.y
		var angle_diff := wrapf(target_angle - current_angle, -PI, PI)
		var rotation_step := deg_to_rad(rotation_speed) * delta
		
		if abs(angle_diff) <= rotation_step:
			rotation.y = target_angle
		else:
			rotation.y += sign(angle_diff) * rotation_step
	
	# Move towards target
	var move_distance := move_speed * delta
	if move_distance > distance:
		move_distance = distance
	
	position += direction * move_distance
