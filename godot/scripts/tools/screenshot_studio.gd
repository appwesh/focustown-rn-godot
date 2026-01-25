extends Node3D
class_name ScreenshotStudio

## Screenshot Studio - Captures 3D item thumbnails with clean background
## 
## Usage:
## 1. Configure settings in the inspector (items_to_capture or items_folder)
## 2. Run the scene (F6 or Play Scene button)
## 3. Screenshots will be saved to output_folder
##
## For character clothing/accessories, use CharacterItemCapture instead

signal capture_started
signal item_captured(item_name: String, path: String)
signal capture_completed(total: int)

## Configuration
@export_group("Items")
@export var items_to_capture: Array[String] = []  ## Paths to FBX/GLTF files to capture
@export var items_folder: String = ""  ## Or scan a folder for all FBX files
@export var recursive_scan: bool = true  ## Scan subfolders too

@export_group("Output")
@export var output_folder: String = "res://screenshots/"
@export var image_size: Vector2i = Vector2i(512, 512)
@export var image_format: String = "png"  ## png, jpg, webp

@export_group("Rendering")
@export var background_color: Color = Color(0.2, 0.2, 0.2, 1.0)
@export var transparent_background: bool = false
@export var camera_distance: float = 2.0
@export var camera_height: float = 0.5
@export var camera_angle: float = 25.0  ## Rotation around Y axis in degrees
@export var auto_fit_to_view: bool = true  ## Auto-adjust camera to fit item
@export var item_rotation: Vector3 = Vector3(0, 0, 0)  ## Additional rotation for items

@export_group("Lighting")
@export var light_energy: float = 1.0
@export var ambient_light_energy: float = 0.3
@export var ambient_light_color: Color = Color.WHITE

@export_group("Character Mode")
@export var use_character_mannequin: bool = false  ## Render clothing on character
@export var mannequin_skin_tone: int = 0
@export var mannequin_face: int = 0

@export_group("Actions")
@export var auto_start: bool = true  ## Start capture automatically when scene runs
@export var quit_when_done: bool = true  ## Quit application after capture completes

## Internal references
var _viewport: SubViewport
var _camera: Camera3D
var _light: DirectionalLight3D
var _world_env: WorldEnvironment
var _item_mount: Node3D
var _mannequin: Node3D
var _is_capturing: bool = false
var _items_queue: Array[String] = []
var _captured_count: int = 0


func _ready() -> void:
	_setup_viewport()
	_setup_camera()
	_setup_lighting()
	_setup_environment()
	_setup_item_mount()
	
	# Auto-start capture when running the scene
	if auto_start and not Engine.is_editor_hint():
		await get_tree().process_frame
		start_capture()


func _setup_viewport() -> void:
	_viewport = SubViewport.new()
	_viewport.name = "CaptureViewport"
	_viewport.size = image_size
	_viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	_viewport.transparent_bg = transparent_background
	_viewport.msaa_3d = Viewport.MSAA_4X
	add_child(_viewport)


func _setup_camera() -> void:
	_camera = Camera3D.new()
	_camera.name = "CaptureCamera"
	_camera.current = true
	_camera.fov = 40
	_update_camera_position()
	_viewport.add_child(_camera)


func _update_camera_position() -> void:
	if not _camera:
		return
	var angle_rad := deg_to_rad(camera_angle)
	_camera.position = Vector3(
		sin(angle_rad) * camera_distance,
		camera_height,
		cos(angle_rad) * camera_distance
	)
	_camera.look_at(Vector3.ZERO, Vector3.UP)


func _setup_lighting() -> void:
	# Main directional light
	_light = DirectionalLight3D.new()
	_light.name = "MainLight"
	_light.light_energy = light_energy
	_light.rotation_degrees = Vector3(-45, -45, 0)
	_light.shadow_enabled = true
	_viewport.add_child(_light)
	
	# Fill light (softer, from opposite side)
	var fill_light := DirectionalLight3D.new()
	fill_light.name = "FillLight"
	fill_light.light_energy = light_energy * 0.5
	fill_light.rotation_degrees = Vector3(-30, 135, 0)
	_viewport.add_child(fill_light)


func _setup_environment() -> void:
	_world_env = WorldEnvironment.new()
	_world_env.name = "Environment"
	
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = background_color
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = ambient_light_color
	env.ambient_light_energy = ambient_light_energy
	
	# Tone mapping for better colors
	env.tonemap_mode = Environment.TONE_MAPPER_ACES
	
	_world_env.environment = env
	_viewport.add_child(_world_env)


func _setup_item_mount() -> void:
	_item_mount = Node3D.new()
	_item_mount.name = "ItemMount"
	_viewport.add_child(_item_mount)


func start_capture() -> void:
	if _is_capturing:
		push_warning("[ScreenshotStudio] Capture already in progress")
		return
	
	# Build items list
	_items_queue.clear()
	
	if not items_folder.is_empty():
		_scan_folder_for_items(items_folder)
	
	for item_path in items_to_capture:
		if not item_path in _items_queue:
			_items_queue.append(item_path)
	
	if _items_queue.is_empty():
		push_warning("[ScreenshotStudio] No items to capture")
		return
	
	# Ensure output folder exists
	_ensure_output_folder()
	
	_is_capturing = true
	_captured_count = 0
	capture_started.emit()
	
	print("[ScreenshotStudio] Starting capture of %d items" % _items_queue.size())
	
	# Process items
	_process_next_item()


func _scan_folder_for_items(folder_path: String) -> void:
	var dir := DirAccess.open(folder_path)
	if not dir:
		push_error("[ScreenshotStudio] Cannot open folder: %s" % folder_path)
		return
	
	dir.list_dir_begin()
	var file_name := dir.get_next()
	
	while file_name != "":
		var full_path := folder_path.path_join(file_name)
		
		if dir.current_is_dir() and recursive_scan and not file_name.begins_with("."):
			_scan_folder_for_items(full_path)
		elif file_name.ends_with(".fbx") or file_name.ends_with(".gltf") or file_name.ends_with(".glb"):
			_items_queue.append(full_path)
		
		file_name = dir.get_next()
	
	dir.list_dir_end()


func _ensure_output_folder() -> void:
	var dir := DirAccess.open("res://")
	if dir:
		var relative_path := output_folder.replace("res://", "")
		if not dir.dir_exists(relative_path):
			dir.make_dir_recursive(relative_path)


func _process_next_item() -> void:
	if _items_queue.is_empty():
		_finish_capture()
		return
	
	var item_path: String = _items_queue.pop_front()
	_capture_item(item_path)


func _capture_item(item_path: String) -> void:
	# Clear previous item
	for child in _item_mount.get_children():
		child.queue_free()
	
	# Wait a frame for cleanup
	await get_tree().process_frame
	
	# Load and instance the item
	var item_scene := load(item_path) as PackedScene
	if not item_scene:
		push_warning("[ScreenshotStudio] Failed to load: %s" % item_path)
		_process_next_item()
		return
	
	var item_instance := item_scene.instantiate()
	item_instance.rotation_degrees = item_rotation
	_item_mount.add_child(item_instance)
	
	# Auto-fit camera if enabled
	if auto_fit_to_view:
		_fit_camera_to_item(item_instance)
	
	# Wait for render
	await get_tree().process_frame
	await get_tree().process_frame
	
	# Capture screenshot
	var image := _viewport.get_texture().get_image()
	
	# Generate output filename
	var item_name := item_path.get_file().get_basename()
	var output_path := output_folder.path_join(item_name + "." + image_format)
	
	# Save image
	var error: Error
	match image_format:
		"png":
			error = image.save_png(output_path)
		"jpg", "jpeg":
			error = image.save_jpg(output_path)
		"webp":
			error = image.save_webp(output_path)
		_:
			error = image.save_png(output_path)
	
	if error != OK:
		push_error("[ScreenshotStudio] Failed to save: %s (error %d)" % [output_path, error])
	else:
		_captured_count += 1
		print("[ScreenshotStudio] Captured: %s" % output_path)
		item_captured.emit(item_name, output_path)
	
	# Process next
	_process_next_item()


func _fit_camera_to_item(item: Node) -> void:
	var aabb := _calculate_aabb(item)
	if aabb.size == Vector3.ZERO:
		return
	
	# Center the item
	var center := aabb.get_center()
	_item_mount.position = -center
	
	# Adjust camera distance based on item size
	var max_dimension := maxf(aabb.size.x, maxf(aabb.size.y, aabb.size.z))
	var new_distance := max_dimension * 2.0
	
	# Update camera
	var angle_rad := deg_to_rad(camera_angle)
	_camera.position = Vector3(
		sin(angle_rad) * new_distance,
		center.y + aabb.size.y * 0.2,
		cos(angle_rad) * new_distance
	)
	_camera.look_at(Vector3(0, center.y * 0.5, 0), Vector3.UP)


func _calculate_aabb(node: Node) -> AABB:
	var result := AABB()
	var first := true
	
	if node is MeshInstance3D:
		var mesh_instance := node as MeshInstance3D
		if mesh_instance.mesh:
			result = mesh_instance.mesh.get_aabb()
			first = false
	
	for child in node.get_children():
		var child_aabb := _calculate_aabb(child)
		if child_aabb.size != Vector3.ZERO:
			if first:
				result = child_aabb
				first = false
			else:
				result = result.merge(child_aabb)
	
	return result


func _finish_capture() -> void:
	_is_capturing = false
	print("[ScreenshotStudio] Capture completed! Total: %d items" % _captured_count)
	print("[ScreenshotStudio] Screenshots saved to: %s" % ProjectSettings.globalize_path(output_folder))
	capture_completed.emit(_captured_count)
	
	if quit_when_done:
		await get_tree().create_timer(0.5).timeout
		get_tree().quit()


## Capture a single item programmatically
func capture_single(item_path: String, output_name: String = "") -> String:
	# Clear previous item
	for child in _item_mount.get_children():
		child.queue_free()
	
	await get_tree().process_frame
	
	var item_scene := load(item_path) as PackedScene
	if not item_scene:
		return ""
	
	var item_instance := item_scene.instantiate()
	item_instance.rotation_degrees = item_rotation
	_item_mount.add_child(item_instance)
	
	if auto_fit_to_view:
		_fit_camera_to_item(item_instance)
	
	await get_tree().process_frame
	await get_tree().process_frame
	
	var image := _viewport.get_texture().get_image()
	
	if output_name.is_empty():
		output_name = item_path.get_file().get_basename()
	
	_ensure_output_folder()
	var output_path := output_folder.path_join(output_name + "." + image_format)
	
	match image_format:
		"png":
			image.save_png(output_path)
		"jpg", "jpeg":
			image.save_jpg(output_path)
		"webp":
			image.save_webp(output_path)
	
	return output_path


## Update settings at runtime
func set_background(color: Color, transparent: bool = false) -> void:
	background_color = color
	transparent_background = transparent
	if _viewport:
		_viewport.transparent_bg = transparent
	if _world_env and _world_env.environment:
		_world_env.environment.background_color = color


func set_camera_settings(distance: float, height: float, angle: float) -> void:
	camera_distance = distance
	camera_height = height
	camera_angle = angle
	_update_camera_position()


func set_image_size(size: Vector2i) -> void:
	image_size = size
	if _viewport:
		_viewport.size = size
