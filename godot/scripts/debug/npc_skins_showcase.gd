extends Node3D
class_name NPCSkinsShowcase

## Debug scene to showcase all curated NPC skins in a grid

@export_group("Grid Settings")
## Number of columns in the grid
@export var grid_columns: int = 5
## Horizontal spacing between characters (X axis)
@export var spacing_x: float = 2.0
## Vertical spacing between rows (Z axis)
@export var spacing_z: float = 3.5
## Character scale
@export var character_scale: float = 1.0

@export_group("Animation")
## Idle animation for all characters
@export var idle_animation: String = "Idle_F"
## Rotate characters to face camera
@export var face_camera: bool = true
## Extra label spacing in front of character (Z axis)
@export var label_offset_z: float = 1.0
## Extra label spacing downward (Y axis)
@export var label_offset_y: float = -0.1

@export_group("Camera")
## Auto-position camera to fit all characters
@export var auto_camera: bool = true
## Camera height offset
@export var camera_height: float = 2.0
## Camera distance multiplier
@export var camera_distance_mult: float = 1.2

var _character_scene: PackedScene
var _spawned_characters: Array[CinematicCharacter] = []
var _camera: Camera3D


func _ready() -> void:
	_character_scene = preload("res://scenes/characters/cinematic_character.tscn")
	
	# Setup camera
	_setup_camera()
	
	# Spawn all NPC skins
	_spawn_all_skins()
	
	# Setup lighting
	_setup_lighting()


func _setup_camera() -> void:
	_camera = Camera3D.new()
	_camera.name = "ShowcaseCamera"
	_camera.fov = 50.0
	_camera.current = true
	add_child(_camera)


func _setup_lighting() -> void:
	# Soft key light from the camera side
	var key_light := DirectionalLight3D.new()
	key_light.name = "KeyLight"
	key_light.light_energy = 1.1
	key_light.shadow_enabled = false
	key_light.rotation_degrees = Vector3(-35, 180, 0)
	add_child(key_light)
	
	# Fill light to reduce harsh shadows
	var fill_light := DirectionalLight3D.new()
	fill_light.name = "FillLight"
	fill_light.light_energy = 0.6
	fill_light.shadow_enabled = false
	fill_light.rotation_degrees = Vector3(-25, 150, 0)
	add_child(fill_light)
	
	# Gentle rim light for separation
	var rim_light := DirectionalLight3D.new()
	rim_light.name = "RimLight"
	rim_light.light_energy = 0.35
	rim_light.shadow_enabled = false
	rim_light.rotation_degrees = Vector3(-15, 0, 0)
	add_child(rim_light)
	
	# Add ambient light via WorldEnvironment
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color(0.92, 0.93, 0.96)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.9, 0.9, 0.95)
	env.ambient_light_energy = 0.85
	
	var world_env := WorldEnvironment.new()
	world_env.environment = env
	add_child(world_env)


func _spawn_all_skins() -> void:
	var skin_count := NPCSkins.get_skin_count()
	var rows := ceili(float(skin_count) / float(grid_columns))
	
	print("[NPCSkinsShowcase] Spawning %d skins in %dx%d grid" % [skin_count, grid_columns, rows])
	
	# Calculate grid center offset
	var grid_width := (grid_columns - 1) * spacing_x
	var grid_depth := (rows - 1) * spacing_z
	var offset := Vector3(-grid_width / 2.0, 0, -grid_depth / 2.0)
	
	for i in range(skin_count):
		var col := i % grid_columns
		var row := i / grid_columns
		
		var pos := Vector3(col * spacing_x, 0, row * spacing_z) + offset
		var skin_data := NPCSkins.get_skin(i)
		var skin_name: String = skin_data.get("name", "skin_%d" % i)
		
		var character := _spawn_character(i, skin_data, skin_name, pos)
		_spawned_characters.append(character)
		
		# Add label below character
		_add_label(skin_name, pos, i)
	
	# Position camera to see all characters
	if auto_camera:
		_position_camera(rows, grid_columns)
	
	print("[NPCSkinsShowcase] Spawned %d characters" % _spawned_characters.size())


func _spawn_character(index: int, skin_data: Dictionary, skin_name: String, pos: Vector3) -> CinematicCharacter:
	var character := _character_scene.instantiate() as CinematicCharacter
	character.name = "Skin_%02d_%s" % [index, skin_name]
	character.default_animation = idle_animation
	character.auto_play = true
	character.position = pos
	character.scale = Vector3.ONE * character_scale
		
	if face_camera and _camera:
		_face_character_to_camera(character)
	
	add_child(character)
	
	# Apply skin after initialization
	_apply_skin_deferred(character, skin_data, skin_name)
	
	return character


func _apply_skin_deferred(character: CinematicCharacter, skin_data: Dictionary, skin_name: String) -> void:
	# Wait for character to initialize
	for i in range(5):
		await get_tree().process_frame
	
	var modular := character.get_modular_character()
	if not modular:
		push_warning("[NPCSkinsShowcase] ModularCharacter not ready for: %s" % skin_name)
		return
	
	character.apply_preset_dict(skin_data, skin_name.capitalize().replace("_", " "))
	print("[NPCSkinsShowcase] Applied skin: %s" % skin_name)


func _add_label(skin_name: String, pos: Vector3, index: int) -> void:
	# Create a Label3D below the character, facing the camera
	var label := Label3D.new()
	label.name = "Label_%02d" % index
	label.text = "%d. %s" % [index + 1, skin_name.replace("_", " ").capitalize()]
	label.position = pos + Vector3(0, label_offset_y, label_offset_z)
	label.font_size = 48
	label.pixel_size = 0.004
	label.outline_size = 12
	label.modulate = Color.WHITE
	label.outline_modulate = Color.BLACK
	label.billboard = BaseMaterial3D.BILLBOARD_ENABLED  # Always face camera
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	add_child(label)


func _position_camera(rows: int, cols: int) -> void:
	# Calculate camera position to see entire grid from above-front angle
	var grid_width := (cols - 1) * spacing_x
	var grid_depth := (rows - 1) * spacing_z
	var max_dimension := maxf(grid_width, grid_depth)
	
	# Use orthographic camera to guarantee full-body visibility across the grid
	_camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	_camera.size = max_dimension * 0.7 + 1.8
	
	# Position camera in front (negative Z) and above the grid
	var cam_distance := max_dimension * camera_distance_mult + 6.0
	var cam_height := max_dimension * 0.6 + camera_height
	_camera.position = Vector3(0, cam_height, -cam_distance)
	_camera.look_at(Vector3(0, 0.8, 0))  # Look at center of grid at chest height
	
	# Ensure characters face the camera after camera placement
	if face_camera:
		_face_all_characters_to_camera()
	
	print("[NPCSkinsShowcase] Camera positioned at: %s, looking at grid center" % _camera.position)


func _face_character_to_camera(character: Node3D) -> void:
	var to_camera := (_camera.global_position - character.global_position)
	to_camera.y = 0
	if to_camera.length() > 0.001:
		var target_yaw := atan2(to_camera.x, to_camera.z)
		character.rotation.y = target_yaw


func _face_all_characters_to_camera() -> void:
	for character in _spawned_characters:
		_face_character_to_camera(character)


func _input(event: InputEvent) -> void:
	if event is InputEventKey:
		var key_event := event as InputEventKey
		if key_event.pressed and not key_event.echo:
			match key_event.keycode:
				KEY_R:
					# Refresh all skins (re-randomize for testing)
					print("[NPCSkinsShowcase] Refreshing all skins...")
					_refresh_all_skins()
				KEY_SPACE:
					# Cycle animations
					_cycle_animations()


func _refresh_all_skins() -> void:
	for i in range(_spawned_characters.size()):
		var character := _spawned_characters[i]
		var skin_data := NPCSkins.get_skin(i)
		var skin_name: String = skin_data.get("name", "skin_%d" % i)
		_apply_skin_deferred(character, skin_data, skin_name)


func _cycle_animations() -> void:
	var animations := ["Idle_F", "BoredIdle_01", "BoredIdle_02", "Emote_Waving_Loop", "Emote_Happy_Loop"]
	var current_idx := animations.find(idle_animation)
	var next_idx := (current_idx + 1) % animations.size()
	idle_animation = animations[next_idx]
	
	print("[NPCSkinsShowcase] Cycling to animation: %s" % idle_animation)
	
	for character in _spawned_characters:
		character.transition_to_animation(idle_animation)


## Get all spawned characters
func get_characters() -> Array[CinematicCharacter]:
	return _spawned_characters


## Get character by skin index
func get_character_by_index(index: int) -> CinematicCharacter:
	if index >= 0 and index < _spawned_characters.size():
		return _spawned_characters[index]
	return null
