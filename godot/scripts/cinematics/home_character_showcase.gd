extends Node3D
class_name HomeCharacterShowcase

## Simple character showcase for the React Native homescreen
## Displays the user's character in the center surrounded by random NPCs
## Receives user character data from RNBridge

signal user_character_updated(character: CinematicCharacter)
signal characters_ready

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

@export_group("Depth Effect")
## Darkening color for back row NPCs (creates depth) - uses multiply shader
@export var npc_darken_color: Color = Color(0.65, 0.65, 0.65)

## Reference to the user character
var _user_character: CinematicCharacter
## References to NPC characters
var _npc_characters: Array[CinematicCharacter] = []
## Packed scene for CinematicCharacter
var _character_scene: PackedScene
## Stored user character data from RN
var _user_character_data: Dictionary = {}


func _ready() -> void:
	_character_scene = preload("res://scenes/characters/cinematic_character.tscn")
	
	# Spawn all characters
	_spawn_user_character()
	_spawn_npc_characters()
	
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


func _spawn_npc_characters() -> void:
	## Spawn NPC characters on both sides of the user
	var positions: Array[Vector3] = _calculate_npc_positions()
	
	for i in range(positions.size()):
		var npc := _spawn_single_npc(i, positions[i])
		_npc_characters.append(npc)
	
	print("[HomeCharacterShowcase] Spawned %d NPC characters" % _npc_characters.size())


func _calculate_npc_positions() -> Array[Vector3]:
	## Calculate positions for NPCs in a single line behind the user
	var positions: Array[Vector3] = []
	
	# Left side NPCs (negative X, all at same depth)
	for i in range(npcs_per_side):
		var x := -(i + 1) * character_spacing
		positions.append(Vector3(x, 0, npc_depth_offset))
	
	# Right side NPCs (positive X, all at same depth)
	for i in range(npcs_per_side):
		var x := (i + 1) * character_spacing
		positions.append(Vector3(x, 0, npc_depth_offset))
	
	return positions


func _spawn_single_npc(index: int, pos: Vector3) -> CinematicCharacter:
	## Spawn a single NPC character at the given position (smaller, behind user)
	var idle_anim: String = npc_idle_animations[index % npc_idle_animations.size()]
	
	var npc := _character_scene.instantiate() as CinematicCharacter
	npc.name = "NPC_%d" % index
	npc.default_animation = idle_anim
	npc.auto_play = true
	npc.position = pos
	npc.rotation_degrees.y = 0.0  # Face the camera
	npc.scale = Vector3.ONE * npc_scale
	
	add_child(npc)
	
	# Apply random preset
	_apply_random_preset_deferred(npc, index)
	
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


## Get all NPC characters
func get_npc_characters() -> Array[CinematicCharacter]:
	return _npc_characters


## Refresh all NPC appearances with new random presets
func refresh_npcs() -> void:
	for i in range(_npc_characters.size()):
		_apply_random_preset_deferred(_npc_characters[i], i)


## Set a specific animation for the user character
func set_user_animation(anim_name: String) -> void:
	if _user_character:
		_user_character.transition_to_animation(anim_name)


## Set animations for all characters
func set_all_animations(anim_name: String) -> void:
	if _user_character:
		_user_character.transition_to_animation(anim_name)
	
	for npc in _npc_characters:
		npc.transition_to_animation(anim_name)
