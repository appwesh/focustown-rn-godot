extends Node3D
class_name CharacterCustomizationShowcase

## Character showcase for the React Native character customization screen
## Displays only the user's character for customization preview (no NPCs)

signal user_character_updated(character: CinematicCharacter)
signal characters_ready

## Character configuration
@export_group("User Character")
@export var user_spawn_position: Vector3 = Vector3(0, 0, 1.0)
@export var user_scale: float = 1.15
@export var user_idle_animation: String = "Idle_F"

## Reference to the user character
var _user_character: CinematicCharacter
## Packed scene for CinematicCharacter
var _character_scene: PackedScene
## Stored user character data from RN
var _user_character_data: Dictionary = {}


func _ready() -> void:
	_character_scene = preload("res://scenes/characters/cinematic_character.tscn")
	
	# Spawn user character
	_spawn_user_character()
	
	# Register with RNBridge for character updates
	_register_with_rnbridge()
	
	characters_ready.emit()


func _register_with_rnbridge() -> void:
	## Register this scene with RNBridge to receive character updates
	if RNBridge:
		RNBridge.register_character_showcase(self)
		print("[CharacterCustomizationShowcase] Registered with RNBridge")


func _spawn_user_character() -> void:
	## Spawn the user's character at center position
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
		# Default appearance until RN sends data (librarian preset)
		_apply_default_appearance_deferred(_user_character)
	
	print("[CharacterCustomizationShowcase] User character spawned")


func _apply_default_appearance_deferred(character: CinematicCharacter) -> void:
	## Apply default librarian appearance to a character after initialization
	for i in range(5):
		await get_tree().process_frame
	
	# Use librarian preset (same as other showcases)
	var preset_data := CharacterPresets.get_preset("librarian")
	if not preset_data.is_empty():
		character.apply_preset_dict(preset_data, "You")
		print("[CharacterCustomizationShowcase] Applied librarian preset to user character")
	else:
		# Fallback to random if preset not found
		character.randomize_appearance()
		print("[CharacterCustomizationShowcase] Applied random appearance (librarian preset not found)")


func _apply_user_character_deferred(data: Dictionary) -> void:
	## Apply user character data after initialization
	for i in range(5):
		await get_tree().process_frame
	
	if not _user_character:
		return
	
	var modular := _user_character.get_modular_character()
	if not modular:
		push_warning("[CharacterCustomizationShowcase] ModularCharacter not ready for user")
		return
	
	# apply_preset_dict auto-shows the character
	_user_character.apply_preset_dict(data, "UserCharacter")
	print("[CharacterCustomizationShowcase] Applied user character data")
	user_character_updated.emit(_user_character)


# =============================================================================
# Public API (called from RNBridge)
# =============================================================================

## Set the user's character appearance from React Native
func set_user_character(skin_data: Dictionary) -> void:
	_user_character_data = skin_data
	
	if _user_character:
		_apply_user_character_deferred(skin_data)
	
	print("[CharacterCustomizationShowcase] User character data received: %s" % skin_data.keys())


## Get the user character node
func get_user_character() -> CinematicCharacter:
	return _user_character


## Set a specific animation for the user character
func set_user_animation(anim_name: String) -> void:
	if _user_character:
		_user_character.transition_to_animation(anim_name)
