extends Node3D
class_name HomeCharacterShowcase

## Character showcase for the React Native homescreen with multiple café support
## Displays the user's character in the center surrounded by café-specific NPCs
## Supports smooth transitions when switching between cafés

signal user_character_updated(character: CinematicCharacter)
signal characters_ready
signal cafe_changed(cafe_index: int)

## Character configuration
@export_group("User Character")
@export var user_spawn_position: Vector3 = Vector3(0, 0, 1.0)
@export var user_scale: float = 1.15
@export var user_idle_animation: String = "Idle_F"

@export_group("NPC Characters")
## Number of NPCs on each side of the user
@export var npcs_per_side: int = 2
## Horizontal spacing between characters
@export var character_spacing: float = 1.2
## How far back each row of NPCs is (arrow formation)
@export var npc_depth_offset: float = -0.6
## NPC scale (smaller than user)
@export var npc_scale: float = 1
## NPC idle animations (randomly assigned)
@export var npc_idle_animations: Array[String] = ["Idle_F", "BoredIdle_01", "BoredIdle_02"]

@export_group("Café Switching")
## Horizontal offset for off-screen café groups
@export var cafe_offscreen_distance: float = 8.0
## Animation duration for café switch
@export var cafe_switch_duration: float = 0.4

@export_group("Depth Effect")
## Darkening color for back row NPCs (creates depth) - uses multiply shader
@export var npc_darken_color: Color = Color(0.65, 0.65, 0.65)

## Café definitions - each café has unique NPC configurations
## Order matches React Native CAFES array: boston-library, korea-cafe, europe-cafe, ghibli-cafe, japan-cafe
const CAFE_COUNT := 5

## Reference to the user character
var _user_character: CinematicCharacter
## NPC groups for each café: Array[Array[CinematicCharacter]]
var _cafe_npc_groups: Array[Array] = []
## Currently active café index
var _current_cafe_index: int = 0
## Packed scene for CinematicCharacter
var _character_scene: PackedScene
## Stored user character data from RN
var _user_character_data: Dictionary = {}
## Animation tween for café switching
var _cafe_switch_tween: Tween = null
## Is a café switch currently animating
var _is_switching: bool = false


func _ready() -> void:
	_character_scene = preload("res://scenes/characters/cinematic_character.tscn")
	
	# Spawn user character (always visible)
	_spawn_user_character()
	
	# Spawn NPC groups for all cafés (positioned off-screen except first)
	_spawn_all_cafe_groups()
	
	# Register with RNBridge for character updates
	_register_with_rnbridge()
	
	characters_ready.emit()


func _register_with_rnbridge() -> void:
	## Register this scene with RNBridge to receive character updates
	if RNBridge:
		RNBridge.register_home_showcase(self)
		print("[HomeCharacterShowcase] Registered with RNBridge")


func _spawn_user_character() -> void:
	## Spawn the user's character at center position (front, bigger)
	_user_character = _character_scene.instantiate() as CinematicCharacter
	_user_character.name = "UserCharacter"
	_user_character.default_animation = user_idle_animation
	_user_character.auto_play = true
	_user_character.position = user_spawn_position
	_user_character.rotation_degrees.y = 0.0  # Face the camera
	_user_character.scale = Vector3.ONE * user_scale
	
	add_child(_user_character)
	
	# Apply user character data if already received from RN
	if not _user_character_data.is_empty():
		_apply_user_character_deferred(_user_character_data)
	else:
		# Default appearance until RN sends data
		_apply_random_appearance_deferred(_user_character)
	
	print("[HomeCharacterShowcase] User character spawned")


func _spawn_all_cafe_groups() -> void:
	## Spawn NPC groups for all cafés
	## First café (index 0) is positioned on-screen, others are off-screen to the right
	_cafe_npc_groups.clear()
	
	for cafe_idx in range(CAFE_COUNT):
		var group: Array[CinematicCharacter] = []
		var x_offset := _get_cafe_x_offset(cafe_idx)
		var positions := _calculate_npc_positions(x_offset)
		
		for npc_idx in range(positions.size()):
			var npc := _spawn_single_npc(cafe_idx, npc_idx, positions[npc_idx])
			group.append(npc)
		
		_cafe_npc_groups.append(group)
	
	var total_npcs := CAFE_COUNT * npcs_per_side * 2
	print("[HomeCharacterShowcase] Spawned %d NPC characters across %d cafés" % [total_npcs, CAFE_COUNT])


func _get_cafe_x_offset(cafe_index: int) -> float:
	## Calculate X offset for a café group relative to current café
	## Current café is at 0, others are positioned off-screen
	var relative_index := cafe_index - _current_cafe_index
	return relative_index * cafe_offscreen_distance


func _calculate_npc_positions(x_offset: float = 0.0) -> Array[Vector3]:
	## Calculate positions for NPCs in a single line behind the user
	var positions: Array[Vector3] = []
	
	# Left side NPCs (negative X, all at same depth)
	for i in range(npcs_per_side):
		var x := -(i + 1) * character_spacing + x_offset
		positions.append(Vector3(x, 0, npc_depth_offset))
	
	# Right side NPCs (positive X, all at same depth)
	for i in range(npcs_per_side):
		var x := (i + 1) * character_spacing + x_offset
		positions.append(Vector3(x, 0, npc_depth_offset))
	
	return positions


func _spawn_single_npc(cafe_index: int, npc_index: int, pos: Vector3) -> CinematicCharacter:
	## Spawn a single NPC character at the given position (smaller, behind user)
	var idle_anim: String = npc_idle_animations[npc_index % npc_idle_animations.size()]
	
	var npc := _character_scene.instantiate() as CinematicCharacter
	npc.name = "Cafe%d_NPC_%d" % [cafe_index, npc_index]
	npc.default_animation = idle_anim
	npc.auto_play = true
	npc.position = pos
	npc.rotation_degrees.y = 0.0  # Face the camera
	npc.scale = Vector3.ONE * npc_scale
	
	add_child(npc)
	
	# Apply random preset with café-specific seed for variety
	_apply_random_preset_deferred(npc, cafe_index * 100 + npc_index)
	
	return npc


func _apply_random_preset_deferred(npc: CinematicCharacter, index: int) -> void:
	## Apply a random preset to the NPC after it's fully initialized
	# Wait for the character to be fully initialized
	for i in range(5):
		await get_tree().process_frame
	
	var modular := npc.get_modular_character()
	if not modular:
		push_warning("[HomeCharacterShowcase] ModularCharacter not ready for NPC_%d" % index)
		return
	
	# Get a random preset - apply_preset_dict/randomize_appearance auto-shows
	var preset_data := CharacterPresets.get_random_preset()
	if not preset_data.is_empty():
		npc.apply_preset_dict(preset_data, "RandomNPC")
		print("[HomeCharacterShowcase] Applied random preset to NPC_%d" % index)
	else:
		npc.randomize_appearance()
		print("[HomeCharacterShowcase] Randomized NPC_%d appearance" % index)
	
	# Apply darkening effect using multiply shader
	#npc.set_color_modulate(npc_darken_color)


func _apply_random_appearance_deferred(character: CinematicCharacter) -> void:
	## Apply random appearance to a character after initialization
	for i in range(5):
		await get_tree().process_frame
	
	# randomize_appearance auto-shows the character
	character.randomize_appearance()
	print("[HomeCharacterShowcase] Applied random appearance to user character")


func _apply_user_character_deferred(data: Dictionary) -> void:
	## Apply user character data after initialization
	for i in range(5):
		await get_tree().process_frame
	
	if not _user_character:
		return
	
	var modular := _user_character.get_modular_character()
	if not modular:
		push_warning("[HomeCharacterShowcase] ModularCharacter not ready for user")
		return
	
	# apply_preset_dict auto-shows the character
	_user_character.apply_preset_dict(data, "UserCharacter")
	print("[HomeCharacterShowcase] Applied user character data")
	user_character_updated.emit(_user_character)


# =============================================================================
# Public API (called from RNBridge)
# =============================================================================

## Set the user's character appearance from React Native
func set_user_character(skin_data: Dictionary) -> void:
	_user_character_data = skin_data
	
	if _user_character:
		_apply_user_character_deferred(skin_data)
	
	print("[HomeCharacterShowcase] User character data received: %s" % skin_data.keys())


## Get the user character node
func get_user_character() -> CinematicCharacter:
	return _user_character


## Get NPC characters for the current café
func get_npc_characters() -> Array[CinematicCharacter]:
	if _current_cafe_index >= 0 and _current_cafe_index < _cafe_npc_groups.size():
		var group: Array = _cafe_npc_groups[_current_cafe_index]
		var typed_array: Array[CinematicCharacter] = []
		for npc in group:
			typed_array.append(npc as CinematicCharacter)
		return typed_array
	return []


## Get NPC characters for a specific café
func get_cafe_npc_characters(cafe_index: int) -> Array[CinematicCharacter]:
	if cafe_index >= 0 and cafe_index < _cafe_npc_groups.size():
		var group: Array = _cafe_npc_groups[cafe_index]
		var typed_array: Array[CinematicCharacter] = []
		for npc in group:
			typed_array.append(npc as CinematicCharacter)
		return typed_array
	return []


## Refresh all NPC appearances with new random presets (current café only)
func refresh_npcs() -> void:
	var npcs := get_npc_characters()
	for i in range(npcs.size()):
		_apply_random_preset_deferred(npcs[i], _current_cafe_index * 100 + i)


## Refresh NPCs for all cafés
func refresh_all_cafe_npcs() -> void:
	for cafe_idx in range(_cafe_npc_groups.size()):
		var group: Array = _cafe_npc_groups[cafe_idx]
		for npc_idx in range(group.size()):
			_apply_random_preset_deferred(group[npc_idx] as CinematicCharacter, cafe_idx * 100 + npc_idx)


## Set a specific animation for the user character
func set_user_animation(anim_name: String) -> void:
	if _user_character:
		_user_character.transition_to_animation(anim_name)


## Set animations for all characters (current café)
func set_all_animations(anim_name: String) -> void:
	if _user_character:
		_user_character.transition_to_animation(anim_name)
	
	for npc in get_npc_characters():
		npc.transition_to_animation(anim_name)


## Get the current café index
func get_current_cafe_index() -> int:
	return _current_cafe_index


## Switch to a different café with smooth animation
## cafe_index: 0 = boston-library, 1 = korea-cafe, 2 = europe-cafe, 3 = ghibli-cafe, 4 = japan-cafe
func set_selected_cafe(cafe_index: int) -> void:
	# Clamp to valid range
	cafe_index = clampi(cafe_index, 0, CAFE_COUNT - 1)
	
	# Skip if already on this café or currently switching
	if cafe_index == _current_cafe_index:
		return
	
	if _is_switching:
		# Cancel current tween and start new one
		if _cafe_switch_tween:
			_cafe_switch_tween.kill()
	
	print("[HomeCharacterShowcase] Switching from café %d to café %d" % [_current_cafe_index, cafe_index])
	
	var old_cafe_index := _current_cafe_index
	_current_cafe_index = cafe_index
	_is_switching = true
	
	# Animate all café groups to their new positions
	_animate_cafe_switch(old_cafe_index, cafe_index)


func _animate_cafe_switch(from_cafe: int, to_cafe: int) -> void:
	## Animate the café switch by sliding all NPC groups
	_cafe_switch_tween = create_tween()
	_cafe_switch_tween.set_ease(Tween.EASE_OUT)
	_cafe_switch_tween.set_trans(Tween.TRANS_CUBIC)
	_cafe_switch_tween.set_parallel(true)
	
	# Calculate new positions for each café group
	for cafe_idx in range(_cafe_npc_groups.size()):
		var target_x_offset := _get_cafe_x_offset(cafe_idx)
		var group: Array = _cafe_npc_groups[cafe_idx]
		var base_positions := _calculate_npc_positions(0.0)
		
		for npc_idx in range(group.size()):
			var npc: CinematicCharacter = group[npc_idx] as CinematicCharacter
			var target_pos := base_positions[npc_idx]
			target_pos.x += target_x_offset
			
			_cafe_switch_tween.tween_property(npc, "position", target_pos, cafe_switch_duration)
	
	# Mark switch complete when done
	_cafe_switch_tween.chain().tween_callback(_on_cafe_switch_complete.bind(to_cafe))


func _on_cafe_switch_complete(cafe_index: int) -> void:
	## Called when café switch animation completes
	_is_switching = false
	cafe_changed.emit(cafe_index)
	print("[HomeCharacterShowcase] Café switch complete: %d" % cafe_index)
