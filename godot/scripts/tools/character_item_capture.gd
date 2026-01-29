extends Node3D
class_name CharacterItemCapture

## Character Item Capture - Captures thumbnails of character clothing/accessories
## 
## This specialized studio renders clothing items on a character mannequin
## and captures each texture variant as a separate thumbnail.
##
## Usage:
## 1. Configure settings in the inspector
## 2. Run the scene (F6 or Play Scene button)
## 3. Screenshots will be saved to the output_folder
##
## NOTE: This must be RUN as a scene (not in editor) because ModularCharacter
## requires runtime execution.

signal capture_started
signal item_captured(category: String, item_name: String, variant: String, path: String)
signal capture_completed(total: int)

## Use constants from ModularCharacter
const CLOTHES_PATH := "res://assets/characters/cozylife/clothes/"
const CLOTHES_TEXTURES_PATH := "res://assets/characters/cozylife/clothes/textures/"
const HAIRS_PATH := "res://assets/characters/cozylife/hairs/"
const CUSTOM_SKINS_PATH := "res://assets/characters/cozylife/custom/"

## Categories and their items (from ModularCharacter)
const TOPS := ["", "SKM_TOP_Tank.fbx", "SKM_TOP_LongSleeve.fbx", "SKM_TOP_Sweater.fbx", "SKM_TOP_PuffSleeveDress.fbx", "SKM_TOP_WarriorTunic.fbx", "SKM_TOP_WizardRobe.fbx", "SKM_TOP_Tshirt.fbx", "SKM_TOP_Hoodie.fbx", "custom/Lofi/Models/SKM_TOP_Lofi.fbx"]
const BOTTOMS := ["", "SKM_BOTTOM_Underwear.fbx", "SKM_BOTTOM_Shorts.fbx", "SKM_BOTTOM_Pants.fbx", "SKM_BOTTOM_SkinnyPants.fbx", "SKM_BOTTOM_FlarePants.fbx", "SKM_BOTTOM_Skirt.fbx", "custom/Lofi/Models/SKM_BOTTOM_Lofi.fbx"]
const SHOES := ["", "SKM_SHOES_CrewSocks.fbx", "SKM_SHOES_Oxfords.fbx", "SKM_SHOES_ChunkyBoots.fbx", "SKM_SHOES_RainBoots.fbx", "SKM_SHOES_WarriorBoots.fbx", "SKM_SHOES_WizardBoots.fbx", "SKM_SHOES_OverKneeSocks.fbx", "SKM_SHOES_Sneakers.fbx"]
const HAIRS := ["", "Afro/SM_HAIR_Afro.fbx", "BabyBangs/SM_HAIR_BabyBangs.fbx", "LongWavy/SM_HAIR_LongWavy.fbx", "MessyKnotBun/SM_HAIR_MessyKnotBun.fbx", "MessySpiky/SM_HAIR_MessySpiky.fbx", "Mullet/SM_HAIR_Mullet.fbx", "StarBuns/SM_HAIR_StarBuns.fbx", "WavyMiddlePart/SM_HAIR_WavyMiddlePart.fbx"]
const HATS := ["", "SM_MISC_Hat_Cowboy.fbx", "SM_MISC_Hat_Fisherman.fbx", "SM_MISC_Hat_PartyHat.fbx", "SM_MISC_Hat_PatrolCap.fbx", "SM_MISC_Hat_PorkPie.fbx", "SM_MISC_Hat_PropellerCap.fbx", "SM_MISC_Hat_StrawHat.fbx", "SM_MISC_Hat_Viking.fbx", "SM_MISC_Hat_BaseballCap.fbx", "SM_MISC_Hat_TopHat.fbx", "SM_MISC_Hat_Witch.fbx", "SM_MISC_Helmet_Robot.fbx", "custom/Lofi/Models/SM_MISC_Hat_HeadPhone.fbx"]
const GLASSES := ["", "SM_MISC_Glasses_Round.fbx", "SM_MISC_Glasses_Aviator.fbx", "SM_MISC_Glasses_CatEye.fbx", "SM_MISC_Glasses_CatEyeSunglasses.fbx", "SM_MISC_Glasses_HeartSunglasses.fbx"]
const NECK := ["", "SM_MISC_Neck_SpikedCollar.fbx", "custom/Lofi/Models/SM_MISC_Neck_Scarf.fbx"]

const PART_NAMES := {
	"Top": ["None", "Tank", "LongSleeve", "Sweater", "PuffSleeveDress", "WarriorTunic", "WizardRobe", "Tshirt", "Hoodie", "LofiTop"],
	"Bottom": ["None", "Underwear", "Shorts", "Pants", "SkinnyPants", "FlarePants", "Skirt", "LofiPants"],
	"Shoes": ["None", "CrewSocks", "Oxfords", "ChunkyBoots", "RainBoots", "WarriorBoots", "WizardBoots", "OverKneeSocks", "Sneakers"],
	"Hair": ["None", "Afro", "BabyBangs", "LongWavy", "MessyKnotBun", "MessySpiky", "Mullet", "StarBuns", "WavyMiddlePart"],
	"Hat": ["None", "Cowboy", "Fisherman", "PartyHat", "PatrolCap", "PorkPie", "PropellerCap", "StrawHat", "Viking", "BaseballCap", "TopHat", "Witch", "RobotHelmet", "Headphone"],
	"Glasses": ["None", "Round", "Aviator", "CatEye", "CatEyeSunglasses", "HeartSunglasses"],
	"Neck": ["None", "SpikedCollar", "LofiScarf"],
}

## Custom items that use non-standard paths
const CUSTOM_ITEM_TEXTURES := {
	"LofiTop": ["Lofi/textures/Lofi_Top.png"],
	"LofiPants": ["Lofi/textures/Lofi_Pants.png"],
	"Headphone": ["Lofi/textures/headphone/headphone_Untextured_Checker_BaseColor.png"],
	"LofiScarf": ["Lofi/textures/Lofi_Neck1.png"],
}

## Texture variants (from ModularCharacter)
const TEXTURE_VARIANTS := {
	"Tank": ["T_TOP_Tank_Black_D.tga", "T_TOP_Tank_BlackRadiation_D.tga", "T_TOP_Tank_Olive_D.tga", "T_TOP_Tank_White_D.tga"],
	"LongSleeve": ["T_TOP_LongSleeve_Black_D.tga", "T_TOP_LongSleeve_Beige_D.tga", "T_TOP_LongSleeve_Olive_D.tga"],
	"Sweater": ["T_TOP_Sweater_Black_D.tga", "T_TOP_Sweater_BlackStar_D.tga", "T_TOP_Sweater_Beige_D.tga", "T_TOP_Sweater_Maroon_D.tga", "T_TOP_Sweater_MaroonMushroom_D.tga", "T_TOP_Sweater_Olive_D.tga", "T_TOP_Sweater_OliveCollegiate_D.tga"],
	"PuffSleeveDress": ["T_TOP_PuffSleeveDress_BlueFloral_D.tga", "T_TOP_PuffSleeveDress_Lavender_D.tga", "T_TOP_PuffSleeveDress_Olive_D.tga", "T_TOP_PuffSleeveDress_PinkFloral_D.tga"],
	"WarriorTunic": ["T_TOP_WarriorTunic_Beige_D.tga", "T_TOP_WarriorTunic_Blue_D.tga", "T_TOP_WarriorTunic_Maroon_D.tga", "T_TOP_WarriorTunic_Olive_D.tga"],
	"WizardRobe": ["T_TOP_WizardRobe_Beige_D.tga", "T_TOP_WizardRobe_Blue_D.tga", "T_TOP_WizardRobe_Maroon_D.tga", "T_TOP_WizardRobe_Olive_D.tga"],
	"Tshirt": ["T_TOP_Tshirt_Black_D.tga", "T_TOP_Tshirt_BlackMushroom_D.tga", "T_TOP_Tshirt_BlackSkull_D.tga", "T_TOP_Tshirt_Beige_D.tga", "T_TOP_Tshirt_Blue_D.tga", "T_TOP_Tshirt_BlueStar_D.tga", "T_TOP_Tshirt_Lavender_D.tga", "T_TOP_Tshirt_LavenderStar_D.tga", "T_TOP_Tshirt_Maroon_D.tga", "T_TOP_Tshirt_MaroonCollegiate_D.tga", "T_TOP_Tshirt_Mustard_D.tga", "T_TOP_Tshirt_Olive_D.tga", "T_TOP_Tshirt_OliveLightning_D.tga", "T_TOP_Tshirt_Pumpkin_D.tga", "T_TOP_Tshirt_PumpkinCollegiate_D.tga", "T_TOP_Tshirt_White_D.tga"],
	"Hoodie": ["T_TOP_Hoodie_Black_D.tga", "T_TOP_Hoodie_BlackSakura_D.tga", "T_TOP_Hoodie_BlackSwirl_D.tga", "T_TOP_Hoodie_Beige_D.tga", "T_TOP_Hoodie_BeigeSakura_D.tga", "T_TOP_Hoodie_OliveCollegiate_D.tga"],
	"Underwear": ["T_BOTTOM_Underwear_White_D.tga"],
	"Shorts": ["T_BOTTOM_Shorts_Black_D.tga", "T_BOTTOM_Shorts_Denim_D.tga", "T_BOTTOM_Shorts_Khaki_D.tga", "T_BOTTOM_Shorts_Olive_D.tga"],
	"Pants": ["T_BOTTOM_Pants_Black_D.tga", "T_BOTTOM_Pants_CamoRed_D.tga", "T_BOTTOM_Pants_CamoSnow_D.tga", "T_BOTTOM_Pants_Denim_D.tga", "T_BOTTOM_Pants_Khaki_D.tga", "T_BOTTOM_Pants_Olive_D.tga"],
	"SkinnyPants": ["T_BOTTOM_SkinnyPants_Brown_D.tga"],
	"FlarePants": ["T_BOTTOM_FlarePants_Black_D.tga", "T_BOTTOM_FlarePants_Denim_D.tga"],
	"Skirt": ["T_BOTTOM_Skirt_Black_D.tga", "T_BOTTOM_Skirt_BlueFloral_D.tga", "T_BOTTOM_Skirt_Denim_D.tga", "T_BOTTOM_Skirt_Houndstooth_D.tga", "T_BOTTOM_Skirt_Olive_D.tga"],
	"CrewSocks": ["T_SHOES_CrewSocks_Black_D.tga", "T_SHOES_CrewSocks_Beige_D.tga", "T_SHOES_CrewSocks_White_D.tga"],
	"Oxfords": ["T_SHOES_Oxfords_Black_D.tga", "T_SHOES_Oxfords_Brown_D.tga"],
	"ChunkyBoots": ["T_SHOES_ChunkyBoots_Black_D.tga", "T_SHOES_ChunkyBoots_Lavender_D.tga"],
	"RainBoots": ["T_SHOES_RainBoots_Black_D.tga", "T_SHOES_RainBoots_Yellow_D.tga"],
	"WarriorBoots": ["T_SHOES_WarriorBoots_Brown_D.tga"],
	"WizardBoots": ["T_SHOES_WizardBoots_Brown_D.tga"],
	"OverKneeSocks": ["T_SHOES_OverKneeSocks_Black_D.tga", "T_SHOES_OverKneeSocks_Beige_D.tga", "T_SHOES_OverKneeSocks_BlackWhiteStripes_D.tga", "T_SHOES_OverKneeSocks_White_D.tga"],
	"Sneakers": ["T_SHOES_Sneakers_BlackWithWhiteStripes_D.tga", "T_SHOES_Sneakers_Chucks_D.tga", "T_SHOES_Sneakers_White_D.tga"],
	"Cowboy": ["T_MISC_Hat_Cowboy_Brown_D.tga", "T_MISC_Hat_Cowboy_Beige_D.tga", "T_MISC_Hat_Cowboy_Pink_D.tga"],
	"Fisherman": ["T_MISC_Hat_Fisherman_Olive_D.tga", "T_MISC_Hat_Fisherman_GreenFroggy_D.tga", "T_MISC_Hat_Fisherman_Khaki_D.tga", "T_MISC_Hat_Fisherman_Orange_D.tga"],
	"PartyHat": ["T_MISC_Hat_PartyHat_Blue_D.tga", "T_MISC_Hat_PartyHat_Red_D.tga"],
	"PatrolCap": ["T_MISC_Hat_PatrolCap_GreenCamo_D.tga", "T_MISC_Hat_PatrolCap_KhakiCamo_D.tga"],
	"PorkPie": ["T_MISC_Hat_PorkPie_Black_D.tga", "T_MISC_Hat_PorkPie_Brown_D.tga", "T_MISC_Hat_PorkPie_Navy_D.tga", "T_MISC_Hat_PorkPie_Red_D.tga"],
	"PropellerCap": ["T_MISC_Hat_PropellerCap_Rainbow_D.tga", "T_MISC_Hat_PropellerCap_Purple_D.tga"],
	"StrawHat": ["T_MISC_Hat_StrawHat_White_D.tga", "T_MISC_Hat_StrawHat_Yellow_D.tga"],
	"Viking": ["T_MISC_Hat_Viking_Blue_D.tga", "T_MISC_Hat_Viking_Red_D.tga"],
	"BaseballCap": ["T_MISC_Hat_BaseballCap_Black_D.tga", "T_MISC_Hat_BaseballCap_BlackGold_D.tga", "T_MISC_Hat_BaseballCap_BlackGreen_D.tga", "T_MISC_Hat_BaseballCap_BlackWhite_D.tga", "T_MISC_Hat_BaseballCap_BlueStar_D.tga", "T_MISC_Hat_BaseballCap_RedBranded_D.tga", "T_MISC_Hat_BaseballCap_White_D.tga", "T_MISC_Hat_BaseballCap_WhiteYellow_D.tga"],
	"TopHat": ["T_MISC_Hat_TopHat_Black_D.tga", "T_MISC_Hat_TopHat_White_D.tga"],
	"Witch": ["T_MISC_Hat_Witch_Black_D.tga", "T_MISC_Hat_Witch_Brown_D.tga", "T_MISC_Hat_Witch_White_D.tga"],
	"RobotHelmet": ["T_MISC_Helmet_Robot_Blue_D.tga"],
	"Round": ["T_MISC_Glasses_Round_Brown_D.tga"],
	"Aviator": ["T_MISC_Glasses_Aviator_Black_D.tga", "T_MISC_Glasses_Aviator_Brown_D.tga"],
	"CatEye": ["T_MISC_Glasses_CatEye_Black_D.tga", "T_MISC_Glasses_CatEye_Maroon_D.tga"],
	"HeartSunglasses": ["T_MISC_Glasses_HeartSunglasses_Pink_D.tga", "T_MISC_Glasses_HeartSunglasses_Black_D.tga", "T_MISC_Glasses_HeartSunglasses_Lavender_D.tga"],
	"SpikedCollar": ["T_MISC_Neck_SpikedCollar_Black_D.tga"],
}

const HAIR_COLORS := ["Default", "Black", "Blonde", "Blue", "Cyan", "DarkBrown", "Ginger", "Gray", "Green", "Holo", "LightBrown", "Maroon", "PastelPink", "Pink", "Purple", "Red", "Sunset", "Teal", "Vampy", "White", "Yellow"]

@export_group("Categories")
@export var capture_categories: Array[String] = ["Top", "Bottom", "Shoes", "Hair", "Hat", "Glasses", "Neck"]
@export var capture_all_variants: bool = true  ## Capture each texture variant
@export var capture_hair_colors: bool = true  ## Capture each hair color variant

@export_group("Output")
@export var output_folder: String = "res://screenshots/character_items/"
@export var image_size: Vector2i = Vector2i(512, 512)
@export var image_format: String = "png"

@export_group("Rendering")
@export var background_color: Color = Color(0.3, 0.3, 0.3, 1.0)  ## Grey background
@export var transparent_background: bool = false

@export_group("Camera Settings")
@export var camera_angle: float = 25.0  ## Rotation around Y axis in degrees
@export var clothing_distance: float = 1.8  ## Distance for tops, bottoms, shoes
@export var accessory_distance: float = 0.8  ## Distance for hats, glasses, hair, neck

@export_group("Actions")
@export var auto_start: bool = true  ## Start capture automatically when scene runs
@export var quit_when_done: bool = true  ## Quit application after capture completes

## Internal
var _viewport: SubViewport
var _camera: Camera3D
var _world_env: WorldEnvironment
var _is_capturing: bool = false
var _captured_count: int = 0


func _ready() -> void:
	_setup_viewport()
	_setup_camera()
	_setup_lighting()
	_setup_environment()
	
	# Auto-start capture when running the scene
	if auto_start and not Engine.is_editor_hint():
		# Wait a frame for everything to initialize
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
	_camera.fov = 35
	_viewport.add_child(_camera)


func _setup_lighting() -> void:
	# Key light
	var key_light := DirectionalLight3D.new()
	key_light.name = "KeyLight"
	key_light.light_energy = 1.2
	key_light.rotation_degrees = Vector3(-40, -30, 0)
	key_light.shadow_enabled = true
	_viewport.add_child(key_light)
	
	# Fill light
	var fill_light := DirectionalLight3D.new()
	fill_light.name = "FillLight"
	fill_light.light_energy = 0.6
	fill_light.rotation_degrees = Vector3(-30, 150, 0)
	_viewport.add_child(fill_light)
	
	# Rim light
	var rim_light := DirectionalLight3D.new()
	rim_light.name = "RimLight"
	rim_light.light_energy = 0.4
	rim_light.rotation_degrees = Vector3(-10, 180, 0)
	_viewport.add_child(rim_light)


func _setup_environment() -> void:
	_world_env = WorldEnvironment.new()
	_world_env.name = "Environment"
	
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = background_color
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color.WHITE
	env.ambient_light_energy = 0.4
	env.tonemap_mode = Environment.TONE_MAPPER_ACES
	
	_world_env.environment = env
	_viewport.add_child(_world_env)


func start_capture() -> void:
	if _is_capturing:
		push_warning("[CharacterItemCapture] Capture already in progress")
		return
	
	_is_capturing = true
	_captured_count = 0
	capture_started.emit()
	
	_ensure_output_folder()
	
	print("[CharacterItemCapture] Starting capture...")
	
	await _capture_all_categories()
	
	_is_capturing = false
	print("[CharacterItemCapture] Capture completed! Total: %d images" % _captured_count)
	print("[CharacterItemCapture] Screenshots saved to: %s" % ProjectSettings.globalize_path(output_folder))
	capture_completed.emit(_captured_count)
	
	if quit_when_done:
		await get_tree().create_timer(0.5).timeout
		get_tree().quit()


func _ensure_output_folder() -> void:
	var dir := DirAccess.open("res://")
	if dir:
		var relative_path := output_folder.replace("res://", "")
		if not dir.dir_exists(relative_path):
			dir.make_dir_recursive(relative_path)


## Item mount for rendering items directly (no character)
var _item_mount: Node3D


func _clear_item_mount() -> void:
	if _item_mount:
		for child in _item_mount.get_children():
			child.queue_free()
		await get_tree().process_frame


func _capture_all_categories() -> void:
	# Create item mount if not exists
	if not _item_mount:
		_item_mount = Node3D.new()
		_item_mount.name = "ItemMount"
		_viewport.add_child(_item_mount)
	
	for category in capture_categories:
		await _capture_category(category)


## Stored fixed position for current category (calculated from first item)
var _category_fixed_position: Vector3 = Vector3.ZERO


func _capture_category(category: String) -> void:
	print("[CharacterItemCapture] Capturing category: %s" % category)
	
	var items_array: Array
	var part_names: Array = PART_NAMES.get(category, [])
	
	match category:
		"Top": items_array = TOPS
		"Bottom": items_array = BOTTOMS
		"Shoes": items_array = SHOES
		"Hair": items_array = HAIRS
		"Hat": items_array = HATS
		"Glasses": items_array = GLASSES
		"Neck": items_array = NECK
		_: return
	
	# Create subfolder for category
	var category_folder := output_folder.path_join(category.to_lower())
	var dir := DirAccess.open("res://")
	if dir:
		dir.make_dir_recursive(category_folder.replace("res://", ""))
	
	# Set camera position for this category (fixed for all items)
	# Camera looks at the appropriate height for each category type
	_setup_camera_for_category(category)
	
	# Skip index 0 (None)
	for i in range(1, items_array.size()):
		var item_path: String = items_array[i]
		if item_path.is_empty():
			continue
		
		var item_name: String = part_names[i] if i < part_names.size() else "Item_%d" % i
		
		# Get texture variants for this item
		var variants: Array = TEXTURE_VARIANTS.get(item_name, [])
		
		# Special handling for hair colors
		if category == "Hair" and capture_hair_colors:
			await _capture_hair_with_colors(category, item_path, item_name, category_folder)
		elif capture_all_variants and not variants.is_empty():
			# Capture each variant
			for variant_idx in range(variants.size()):
				await _capture_item_direct(category, item_path, item_name, variants[variant_idx], category_folder)
		else:
			# Just capture the item with first variant or no texture
			var first_variant: String = variants[0] if not variants.is_empty() else ""
			await _capture_item_direct(category, item_path, item_name, first_variant, category_folder)


func _load_item_for_measurement(category: String, item_file: String) -> void:
	## Load item without positioning - used to measure first item for fixed position
	await _clear_item_mount()
	
	var full_path: String
	if item_file.begins_with("custom/"):
		full_path = CUSTOM_SKINS_PATH + item_file.substr(7)
	elif category == "Hair":
		full_path = HAIRS_PATH + item_file
	else:
		full_path = CLOTHES_PATH + item_file
	
	var item_scene := load(full_path) as PackedScene
	if not item_scene:
		return
	
	var item_instance := item_scene.instantiate()
	_item_mount.add_child(item_instance)
	_item_mount.position = Vector3.ZERO


func _capture_item_direct(category: String, item_file: String, item_name: String, variant_texture: String, folder: String) -> void:
	# Clear previous item
	await _clear_item_mount()
	
	# Determine the full path
	var full_path: String
	if item_file.begins_with("custom/"):
		full_path = CUSTOM_SKINS_PATH + item_file.substr(7)
	elif category == "Hair":
		full_path = HAIRS_PATH + item_file
	else:
		full_path = CLOTHES_PATH + item_file
	
	# Load the item
	var item_scene := load(full_path) as PackedScene
	if not item_scene:
		push_warning("[CharacterItemCapture] Failed to load: %s" % full_path)
		return
	
	var item_instance := item_scene.instantiate()
	_item_mount.add_child(item_instance)
	
	# Find the mesh and apply texture
	var mesh_instance := _find_mesh(item_instance)
	if mesh_instance and not variant_texture.is_empty():
		_apply_texture_to_mesh(mesh_instance, item_name, variant_texture)
	
	# Keep item at origin - camera is positioned to look at the right height
	await get_tree().process_frame
	_item_mount.position = Vector3.ZERO
	
	# Wait for render
	await get_tree().process_frame
	await get_tree().process_frame
	
	# Capture
	var image := _viewport.get_texture().get_image()
	
	# Generate filename
	var filename: String
	if variant_texture.is_empty():
		filename = "%s.%s" % [item_name, image_format]
	else:
		var color_name := _extract_color_from_texture(variant_texture)
		filename = "%s_%s.%s" % [item_name, color_name, image_format]
	
	var output_path := folder.path_join(filename)
	
	# Save
	_save_image(image, output_path)
	_captured_count += 1
	
	print("[CharacterItemCapture] Captured: %s" % output_path)
	item_captured.emit(category, item_name, variant_texture, output_path)


func _capture_hair_with_colors(category: String, item_file: String, item_name: String, folder: String) -> void:
	for color_idx in range(HAIR_COLORS.size()):
		var color_name: String = HAIR_COLORS[color_idx]
		
		# Clear previous item
		await _clear_item_mount()
		
		# Load hair mesh
		var full_path: String = HAIRS_PATH + item_file
		var item_scene := load(full_path) as PackedScene
		if not item_scene:
			push_warning("[CharacterItemCapture] Failed to load: %s" % full_path)
			continue
		
		var item_instance := item_scene.instantiate()
		_item_mount.add_child(item_instance)
		
		# Find mesh and apply hair texture
		var mesh_instance := _find_mesh(item_instance)
		if mesh_instance:
			_apply_hair_texture_to_mesh(mesh_instance, item_name, color_name)
		
		# Keep item at origin - camera is positioned to look at the right height
		await get_tree().process_frame
		_item_mount.position = Vector3.ZERO
		
		await get_tree().process_frame
		await get_tree().process_frame
		
		# Capture
		var image := _viewport.get_texture().get_image()
		
		var filename := "%s_%s.%s" % [item_name, color_name, image_format]
		var output_path := folder.path_join(filename)
		
		_save_image(image, output_path)
		_captured_count += 1
		
		print("[CharacterItemCapture] Captured: %s" % output_path)
		item_captured.emit(category, item_name, color_name, output_path)


func _find_mesh(node: Node) -> MeshInstance3D:
	if node is MeshInstance3D:
		return node as MeshInstance3D
	for child in node.get_children():
		var found := _find_mesh(child)
		if found:
			return found
	return null


func _apply_texture_to_mesh(mesh: MeshInstance3D, item_name: String, texture_file: String) -> void:
	var texture_path: String
	
	# Check for custom item textures
	if CUSTOM_ITEM_TEXTURES.has(item_name):
		var custom_textures: Array = CUSTOM_ITEM_TEXTURES[item_name]
		if not custom_textures.is_empty():
			texture_path = CUSTOM_SKINS_PATH + custom_textures[0]
	else:
		texture_path = CLOTHES_TEXTURES_PATH + texture_file
	
	var texture := load(texture_path) as Texture2D
	if texture:
		var material := StandardMaterial3D.new()
		material.albedo_texture = texture
		mesh.material_override = material


func _apply_hair_texture_to_mesh(mesh: MeshInstance3D, hair_name: String, color_name: String) -> void:
	var texture_path: String
	if color_name == "Default":
		texture_path = HAIRS_PATH + hair_name + "/T_HAIR_" + hair_name + "_D.tga"
	else:
		texture_path = HAIRS_PATH + hair_name + "/ColorVariations/T_HAIR_" + hair_name + "_" + color_name + "_D.tga"
	
	var texture := load(texture_path) as Texture2D
	if not texture:
		# Fallback to default
		texture_path = HAIRS_PATH + hair_name + "/T_HAIR_" + hair_name + "_D.tga"
		texture = load(texture_path) as Texture2D
	
	if texture:
		var material := StandardMaterial3D.new()
		material.albedo_texture = texture
		mesh.material_override = material


func _setup_camera_for_category(category: String) -> void:
	## Set fixed camera position and look-at point based on category
	## Items are NOT moved - camera looks at where items naturally sit on the character
	var distance: float
	var camera_height: float
	var look_at_height: float
	
	match category:
		"Top":
			distance = clothing_distance
			camera_height = 1.2
			look_at_height = 1.1  # Torso area
		"Bottom":
			distance = clothing_distance
			camera_height = 0.6
			look_at_height = 0.5  # Hip/leg area
		"Shoes":
			distance = clothing_distance * 0.8
			camera_height = 0.2
			look_at_height = 0.1  # Feet area
		"Hair", "Hat":
			distance = accessory_distance
			camera_height = 1.7
			look_at_height = 1.65  # Head area
		"Glasses":
			distance = accessory_distance * 0.7
			camera_height = 1.6
			look_at_height = 1.55  # Face area
		"Neck":
			distance = accessory_distance
			camera_height = 1.4
			look_at_height = 1.35  # Neck area
		_:
			distance = clothing_distance
			camera_height = 1.0
			look_at_height = 1.0
	
	var angle_rad := deg_to_rad(camera_angle)
	_camera.position = Vector3(
		sin(angle_rad) * distance,
		camera_height,
		cos(angle_rad) * distance
	)
	_camera.look_at(Vector3(0, look_at_height, 0), Vector3.UP)


func _center_item(item: Node) -> void:
	## Center the item at origin based on its bounding box
	var aabb := _calculate_aabb(item)
	if aabb.size == Vector3.ZERO:
		return
	
	# Move item mount so item center is at origin
	var center := aabb.get_center()
	_item_mount.position = -center


func _calculate_aabb(node: Node) -> AABB:
	var result := AABB()
	var first := true
	
	if node is MeshInstance3D:
		var mi := node as MeshInstance3D
		if mi.mesh:
			var mesh_aabb := mi.mesh.get_aabb()
			# Transform to global space
			result = mi.global_transform * mesh_aabb
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


func _extract_color_from_texture(texture_filename: String) -> String:
	# Extract color name from texture filename like "T_TOP_Tank_Black_D.tga" -> "Black"
	var parts := texture_filename.replace("_D.tga", "").split("_")
	if parts.size() >= 4:
		return parts[parts.size() - 1]
	return "Default"


func _save_image(image: Image, path: String) -> void:
	match image_format:
		"png":
			image.save_png(path)
		"jpg", "jpeg":
			image.save_jpg(path)
		"webp":
			image.save_webp(path)
		_:
			image.save_png(path)
