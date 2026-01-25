extends Control

## Item Capture UI - Manual tool for previewing and capturing character items
##
## Features:
## - Category and item selection
## - Texture variant selection
## - Live 3D preview
## - Camera distance/angle controls
## - Single item or batch export

const CLOTHES_PATH := "res://assets/characters/cozylife/clothes/"
const CLOTHES_TEXTURES_PATH := "res://assets/characters/cozylife/clothes/textures/"
const HAIRS_PATH := "res://assets/characters/cozylife/hairs/"
const CUSTOM_SKINS_PATH := "res://assets/characters/cozylife/custom/"

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

const CUSTOM_ITEM_TEXTURES := {
	"LofiTop": ["Lofi/Textures/Lofi_Top.png"],
	"LofiPants": ["Lofi/Textures/Lofi_Pants.png"],
	"Headphone": ["Lofi/Textures/headphone/headphone_Untextured_Checker_BaseColor.png"],
	"LofiScarf": ["Lofi/Textures/Lofi_Neck1.png"],
}

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

## Predefined outfit sets (matching store OUTFIT_SETS)
const OUTFIT_SETS := {
	"Lofi Girl Set": {
		"Top": {"index": 9, "variant": 0},  # LofiTop
		"Bottom": {"index": 7, "variant": 0},  # LofiPants
		"Hat": {"index": 13, "variant": 0},  # Headphone
		"Neck": {"index": 2, "variant": 0},  # LofiScarf
	},
	"Beige Wizard Set": {
		"Top": {"index": 6, "variant": 0},  # WizardRobe Beige
		"Bottom": {"index": 4, "variant": 0},  # SkinnyPants
		"Shoes": {"index": 6, "variant": 0},  # WizardBoots
	},
	"Blue Wizard Set": {
		"Top": {"index": 6, "variant": 1},  # WizardRobe Blue
		"Bottom": {"index": 4, "variant": 0},  # SkinnyPants
		"Shoes": {"index": 6, "variant": 0},  # WizardBoots
	},
	"Maroon Wizard Set": {
		"Top": {"index": 6, "variant": 2},  # WizardRobe Maroon
		"Bottom": {"index": 4, "variant": 0},  # SkinnyPants
		"Shoes": {"index": 6, "variant": 0},  # WizardBoots
	},
	"Olive Wizard Set": {
		"Top": {"index": 6, "variant": 3},  # WizardRobe Olive
		"Bottom": {"index": 4, "variant": 0},  # SkinnyPants
		"Shoes": {"index": 6, "variant": 0},  # WizardBoots
	},
}

## UI References
@onready var category_option: OptionButton = %CategoryOption
@onready var item_option: OptionButton = %ItemOption
@onready var variant_option: OptionButton = %VariantOption
@onready var distance_slider: HSlider = %DistanceSlider
@onready var height_slider: HSlider = %HeightSlider
@onready var angle_slider: HSlider = %AngleSlider
@onready var distance_label: Label = %DistanceLabel
@onready var height_label: Label = %HeightLabel
@onready var angle_label: Label = %AngleLabel
@onready var preview_container: SubViewportContainer = %PreviewContainer
@onready var preview_viewport: SubViewport = %PreviewViewport
@onready var status_label: Label = %StatusLabel
@onready var output_folder_edit: LineEdit = %OutputFolderEdit
@onready var resolution_option: OptionButton = %ResolutionOption
@onready var bg_color_picker: ColorPickerButton = %BgColorPicker
@onready var outfit_set_option: OptionButton = %OutfitSetOption
@onready var export_outfit_button: Button = %ExportOutfitButton
@onready var export_all_outfits_button: Button = %ExportAllOutfitsButton
@onready var outfit_character: Node3D = %OutfitCharacter  # ModularCharacter for outfit sets

## 3D Scene references
var _camera: Camera3D
var _item_mount: Node3D
var _world_env: WorldEnvironment

## State
var _current_category: String = "Top"
var _current_item_index: int = 0
var _current_variant_index: int = 0
var _camera_distance: float = 1.5
var _camera_height_offset: float = 0.0  # Offset from category default height
var _camera_angle: float = 25.0
var _output_folder: String = "res://screenshots/character_items/"
var _image_size: Vector2i = Vector2i(512, 512)
var _bg_color: Color = Color(0.35, 0.35, 0.35, 1.0)
var _current_outfit_set: String = ""


func _ready() -> void:
	_setup_3d_scene()
	_setup_ui()
	_populate_categories()
	_on_category_changed(0)


func _setup_3d_scene() -> void:
	# Camera
	_camera = Camera3D.new()
	_camera.name = "Camera"
	_camera.current = true
	_camera.fov = 40
	preview_viewport.add_child(_camera)
	
	# Lighting
	var key_light := DirectionalLight3D.new()
	key_light.light_energy = 1.2
	key_light.rotation_degrees = Vector3(-40, -30, 0)
	preview_viewport.add_child(key_light)
	
	var fill_light := DirectionalLight3D.new()
	fill_light.light_energy = 0.6
	fill_light.rotation_degrees = Vector3(-30, 150, 0)
	preview_viewport.add_child(fill_light)
	
	# Environment
	_world_env = WorldEnvironment.new()
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = _bg_color
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color.WHITE
	env.ambient_light_energy = 0.4
	env.tonemap_mode = Environment.TONE_MAPPER_ACES
	_world_env.environment = env
	preview_viewport.add_child(_world_env)
	
	# Item mount
	_item_mount = Node3D.new()
	_item_mount.name = "ItemMount"
	preview_viewport.add_child(_item_mount)
	
	_update_camera()


func _setup_ui() -> void:
	# Connect signals
	category_option.item_selected.connect(_on_category_changed)
	item_option.item_selected.connect(_on_item_changed)
	variant_option.item_selected.connect(_on_variant_changed)
	distance_slider.value_changed.connect(_on_distance_changed)
	height_slider.value_changed.connect(_on_height_changed)
	angle_slider.value_changed.connect(_on_angle_changed)
	bg_color_picker.color_changed.connect(_on_bg_color_changed)
	resolution_option.item_selected.connect(_on_resolution_changed)
	output_folder_edit.text_changed.connect(_on_output_folder_changed)
	
	# Outfit set UI (optional - check if elements exist)
	if outfit_set_option:
		outfit_set_option.item_selected.connect(_on_outfit_set_changed)
		_populate_outfit_sets()
	if export_outfit_button:
		export_outfit_button.pressed.connect(_on_export_outfit_pressed)
	if export_all_outfits_button:
		export_all_outfits_button.pressed.connect(_on_export_all_outfits_pressed)
	
	# Set initial values
	distance_slider.value = _camera_distance
	height_slider.value = _camera_height_offset
	angle_slider.value = _camera_angle
	bg_color_picker.color = _bg_color
	output_folder_edit.text = _output_folder
	
	# Populate resolution options
	resolution_option.add_item("256x256", 0)
	resolution_option.add_item("512x512", 1)
	resolution_option.add_item("1024x1024", 2)
	resolution_option.select(1)  # Default 512


func _populate_categories() -> void:
	category_option.clear()
	for cat in PART_NAMES.keys():
		category_option.add_item(cat)


func _populate_items() -> void:
	item_option.clear()
	var names: Array = PART_NAMES.get(_current_category, [])
	for i in range(names.size()):
		if i == 0:
			continue  # Skip "None"
		item_option.add_item(names[i], i)
	
	if item_option.item_count > 0:
		item_option.select(0)
		_current_item_index = item_option.get_item_id(0)


func _populate_variants() -> void:
	variant_option.clear()
	var names: Array = PART_NAMES.get(_current_category, [])
	if _current_item_index <= 0 or _current_item_index >= names.size():
		return
	
	var item_name: String = names[_current_item_index]
	
	# Check if it's hair (use hair colors)
	if _current_category == "Hair":
		for color in HAIR_COLORS:
			variant_option.add_item(color)
	else:
		var variants: Array = TEXTURE_VARIANTS.get(item_name, [])
		if variants.is_empty():
			variant_option.add_item("Default")
		else:
			for v in variants:
				var color_name := _extract_color_from_texture(v)
				variant_option.add_item(color_name)
	
	if variant_option.item_count > 0:
		variant_option.select(0)
		_current_variant_index = 0


func _on_category_changed(index: int) -> void:
	_current_category = category_option.get_item_text(index)
	_update_camera()  # Update camera height for new category
	_populate_items()
	_populate_variants()
	_load_current_item()


func _on_item_changed(index: int) -> void:
	_current_item_index = item_option.get_item_id(index)
	_populate_variants()
	_load_current_item()


func _on_variant_changed(index: int) -> void:
	_current_variant_index = index
	_load_current_item()


func _on_distance_changed(value: float) -> void:
	_camera_distance = value
	distance_label.text = "%.1f" % value
	_update_camera()


func _on_height_changed(value: float) -> void:
	_camera_height_offset = value
	height_label.text = "%.1f" % value
	_update_camera()


func _on_angle_changed(value: float) -> void:
	_camera_angle = value
	angle_label.text = "%.0f°" % value
	_update_camera()


func _on_bg_color_changed(color: Color) -> void:
	_bg_color = color
	if _world_env and _world_env.environment:
		_world_env.environment.background_color = color


func _on_resolution_changed(index: int) -> void:
	match index:
		0: _image_size = Vector2i(256, 256)
		1: _image_size = Vector2i(512, 512)
		2: _image_size = Vector2i(1024, 1024)


func _on_output_folder_changed(text: String) -> void:
	_output_folder = text


func _update_camera() -> void:
	if not _camera:
		return
	
	# Get camera height based on current category + user offset
	var base_height := _get_category_look_at_height()
	var look_at_height := base_height + _camera_height_offset
	
	var angle_rad := deg_to_rad(_camera_angle)
	_camera.position = Vector3(
		sin(angle_rad) * _camera_distance,
		look_at_height + 0.1,  # Slightly above look-at point
		cos(angle_rad) * _camera_distance
	)
	_camera.look_at(Vector3(0, look_at_height, 0), Vector3.UP)


func _get_category_look_at_height() -> float:
	## Get the height where items sit on the character for this category
	match _current_category:
		"Top": return 1.1
		"Bottom": return 0.5
		"Shoes": return 0.1
		"Hair", "Hat": return 1.65
		"Glasses": return 1.55
		"Neck": return 1.35
		_: return 1.0


func _load_current_item() -> void:
	# Hide outfit character, show item mount for single items
	if outfit_character:
		outfit_character.visible = false
	_item_mount.visible = true
	
	# Clear existing
	for child in _item_mount.get_children():
		child.queue_free()
	
	await get_tree().process_frame
	
	var items_array: Array = _get_items_array()
	if _current_item_index <= 0 or _current_item_index >= items_array.size():
		status_label.text = "No item selected"
		return
	
	var item_file: String = items_array[_current_item_index]
	if item_file.is_empty():
		return
	
	# Determine path
	var full_path: String
	if item_file.begins_with("custom/"):
		full_path = CUSTOM_SKINS_PATH + item_file.substr(7)
	elif _current_category == "Hair":
		full_path = HAIRS_PATH + item_file
	else:
		full_path = CLOTHES_PATH + item_file
	
	var item_scene := load(full_path) as PackedScene
	if not item_scene:
		status_label.text = "Failed to load: " + full_path
		return
	
	var item_instance := item_scene.instantiate()
	_item_mount.add_child(item_instance)
	
	# Apply texture
	var mesh := _find_mesh(item_instance)
	if mesh:
		_apply_current_texture(mesh)
	
	# Keep item at origin - camera looks at the right height for category
	await get_tree().process_frame
	_item_mount.position = Vector3.ZERO
	
	var names: Array = PART_NAMES.get(_current_category, [])
	var item_name: String = names[_current_item_index] if _current_item_index < names.size() else "Unknown"
	status_label.text = "Loaded: " + item_name


func _get_items_array() -> Array:
	match _current_category:
		"Top": return TOPS
		"Bottom": return BOTTOMS
		"Shoes": return SHOES
		"Hair": return HAIRS
		"Hat": return HATS
		"Glasses": return GLASSES
		"Neck": return NECK
	return []


func _apply_current_texture(mesh: MeshInstance3D) -> void:
	var names: Array = PART_NAMES.get(_current_category, [])
	if _current_item_index >= names.size():
		return
	
	var item_name: String = names[_current_item_index]
	
	if _current_category == "Hair":
		var color_name: String = HAIR_COLORS[_current_variant_index] if _current_variant_index < HAIR_COLORS.size() else "Default"
		_apply_hair_texture(mesh, item_name, color_name)
	else:
		var variants: Array = TEXTURE_VARIANTS.get(item_name, [])
		if not variants.is_empty() and _current_variant_index < variants.size():
			_apply_texture(mesh, item_name, variants[_current_variant_index])
		elif CUSTOM_ITEM_TEXTURES.has(item_name):
			var custom: Array = CUSTOM_ITEM_TEXTURES[item_name]
			if not custom.is_empty():
				var tex := load(CUSTOM_SKINS_PATH + custom[0]) as Texture2D
				if tex:
					var mat := StandardMaterial3D.new()
					mat.albedo_texture = tex
					mesh.material_override = mat


func _apply_texture(mesh: MeshInstance3D, item_name: String, texture_file: String) -> void:
	var texture_path: String = CLOTHES_TEXTURES_PATH + texture_file
	var texture := load(texture_path) as Texture2D
	if texture:
		var mat := StandardMaterial3D.new()
		mat.albedo_texture = texture
		mesh.material_override = mat
		print("[ItemCaptureUI] Applied texture: %s" % texture_path)
	else:
		push_warning("[ItemCaptureUI] Failed to load texture: %s" % texture_path)


func _apply_hair_texture(mesh: MeshInstance3D, hair_name: String, color_name: String) -> void:
	var texture_path: String
	if color_name == "Default":
		texture_path = HAIRS_PATH + hair_name + "/T_HAIR_" + hair_name + "_D.tga"
	else:
		texture_path = HAIRS_PATH + hair_name + "/ColorVariations/T_HAIR_" + hair_name + "_" + color_name + "_D.tga"
	
	var texture := load(texture_path) as Texture2D
	if not texture:
		texture_path = HAIRS_PATH + hair_name + "/T_HAIR_" + hair_name + "_D.tga"
		texture = load(texture_path) as Texture2D
	
	if texture:
		var mat := StandardMaterial3D.new()
		mat.albedo_texture = texture
		mesh.material_override = mat
		print("[ItemCaptureUI] Applied hair texture: %s (%s)" % [hair_name, color_name])
	else:
		push_warning("[ItemCaptureUI] Failed to load hair texture: %s" % texture_path)


func _find_mesh(node: Node) -> MeshInstance3D:
	if node is MeshInstance3D:
		return node
	for child in node.get_children():
		var found := _find_mesh(child)
		if found:
			return found
	return null


func _center_item(item: Node) -> void:
	var aabb := _calculate_aabb(item)
	if aabb.size != Vector3.ZERO:
		_item_mount.position = -aabb.get_center()


func _load_item_without_center(item_file: String) -> void:
	## Load item without centering - used for batch export with fixed position
	# Clear existing
	for child in _item_mount.get_children():
		child.queue_free()
	
	await get_tree().process_frame
	
	if item_file.is_empty():
		return
	
	# Determine path
	var full_path: String
	if item_file.begins_with("custom/"):
		full_path = CUSTOM_SKINS_PATH + item_file.substr(7)
	elif _current_category == "Hair":
		full_path = HAIRS_PATH + item_file
	else:
		full_path = CLOTHES_PATH + item_file
	
	var item_scene := load(full_path) as PackedScene
	if not item_scene:
		return
	
	var item_instance := item_scene.instantiate()
	_item_mount.add_child(item_instance)
	_item_mount.position = Vector3.ZERO  # Reset position, don't center


func _calculate_aabb(node: Node) -> AABB:
	var result := AABB()
	var first := true
	if node is MeshInstance3D:
		var mi := node as MeshInstance3D
		if mi.mesh:
			result = mi.global_transform * mi.mesh.get_aabb()
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
	var parts := texture_filename.replace("_D.tga", "").split("_")
	if parts.size() >= 4:
		return parts[parts.size() - 1]
	return "Default"


## Export functions

func _on_export_current_pressed() -> void:
	await _capture_current_item()


func _on_export_category_pressed() -> void:
	await _capture_all_in_category()


func _on_export_all_pressed() -> void:
	await _capture_everything()


func _capture_current_item() -> void:
	_ensure_output_folder()
	
	var names: Array = PART_NAMES.get(_current_category, [])
	if _current_item_index >= names.size():
		return
	
	var item_name: String = names[_current_item_index]
	var variant_name: String = variant_option.get_item_text(_current_variant_index)
	
	# Resize viewport for capture
	var original_size := preview_viewport.size
	preview_viewport.size = _image_size
	await get_tree().process_frame
	await get_tree().process_frame
	
	var image := preview_viewport.get_texture().get_image()
	
	# Restore viewport size
	preview_viewport.size = original_size
	
	var folder := _output_folder.path_join(_current_category.to_lower())
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(folder))
	
	var filename := "%s_%s.png" % [item_name, variant_name]
	var path := folder.path_join(filename)
	image.save_png(path)
	
	status_label.text = "Exported: " + path
	print("[ItemCaptureUI] Exported: %s" % path)


func _capture_all_in_category() -> void:
	_ensure_output_folder()
	
	var items_array: Array = _get_items_array()
	var names: Array = PART_NAMES.get(_current_category, [])
	var count := 0
	
	var folder := _output_folder.path_join(_current_category.to_lower())
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(folder))
	
	# Resize viewport
	var original_size := preview_viewport.size
	preview_viewport.size = _image_size
	
	# Update camera for this category
	_update_camera()
	
	for i in range(1, items_array.size()):
		_current_item_index = i
		var item_name: String = names[i] if i < names.size() else "Item_%d" % i
		
		# Get variants
		var variants: Array
		if _current_category == "Hair":
			variants = HAIR_COLORS
		else:
			variants = TEXTURE_VARIANTS.get(item_name, ["Default"])
			if variants.is_empty():
				variants = ["Default"]
		
		for v_idx in range(variants.size()):
			await _load_item_without_center(items_array[i])
			_item_mount.position = Vector3.ZERO  # Keep at origin
			
			# Apply texture directly (don't rely on _current_variant_index)
			var mesh := _find_mesh(_item_mount.get_child(0)) if _item_mount.get_child_count() > 0 else null
			if mesh:
				if _current_category == "Hair":
					var color_name: String = HAIR_COLORS[v_idx]
					_apply_hair_texture(mesh, item_name, color_name)
				else:
					var texture_file: String = variants[v_idx]
					if texture_file != "Default":
						_apply_texture(mesh, item_name, texture_file)
					elif CUSTOM_ITEM_TEXTURES.has(item_name):
						var custom: Array = CUSTOM_ITEM_TEXTURES[item_name]
						if not custom.is_empty():
							var tex := load(CUSTOM_SKINS_PATH + custom[0]) as Texture2D
							if tex:
								var mat := StandardMaterial3D.new()
								mat.albedo_texture = tex
								mesh.material_override = mat
			
			await get_tree().process_frame
			await get_tree().process_frame
			
			var image := preview_viewport.get_texture().get_image()
			var variant_name: String
			if _current_category == "Hair":
				variant_name = HAIR_COLORS[v_idx]
			else:
				variant_name = _extract_color_from_texture(variants[v_idx]) if variants[v_idx] != "Default" else "Default"
			
			var filename := "%s_%s.png" % [item_name, variant_name]
			var path := folder.path_join(filename)
			image.save_png(path)
			count += 1
			status_label.text = "Exporting... %d" % count
	
	preview_viewport.size = original_size
	status_label.text = "Exported %d images to %s" % [count, folder]
	print("[ItemCaptureUI] Exported %d images" % count)


func _capture_everything() -> void:
	var total := 0
	for cat_idx in range(category_option.item_count):
		category_option.select(cat_idx)
		_on_category_changed(cat_idx)
		await get_tree().process_frame
		
		var before := total
		await _capture_all_in_category()
		# Count is handled inside _capture_all_in_category
	
	status_label.text = "Export complete! Check " + _output_folder


func _ensure_output_folder() -> void:
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(_output_folder))


## Outfit Set Functions

func _populate_outfit_sets() -> void:
	if not outfit_set_option:
		return
	outfit_set_option.clear()
	outfit_set_option.add_item("-- Select Outfit Set --")
	for set_name in OUTFIT_SETS.keys():
		outfit_set_option.add_item(set_name)


func _on_outfit_set_changed(index: int) -> void:
	if index == 0:
		_current_outfit_set = ""
		return
	
	_current_outfit_set = outfit_set_option.get_item_text(index)
	await _load_outfit_set(_current_outfit_set)


func _on_export_outfit_pressed() -> void:
	if _current_outfit_set.is_empty():
		status_label.text = "Select an outfit set first"
		return
	# Capture current outfit without reloading (it's already displayed)
	await _capture_current_outfit()


func _on_export_all_outfits_pressed() -> void:
	await _capture_all_outfit_sets()


func _load_outfit_set(set_name: String, adjust_camera: bool = true) -> void:
	## Load outfit set using ModularCharacter for correct bone attachment positioning
	if not OUTFIT_SETS.has(set_name):
		status_label.text = "Unknown outfit set: " + set_name
		return
	
	if not outfit_character:
		push_error("[ItemCaptureUI] OutfitCharacter node not found!")
		status_label.text = "OutfitCharacter not available"
		return
	
	print("[ItemCaptureUI] Loading outfit set: %s" % set_name)
	
	# Hide single item mount, show outfit character
	_item_mount.visible = false
	outfit_character.visible = true
	
	# Ensure ModularCharacter is initialized and shown
	# Wait for it to be ready (it loads in _ready)
	for i in range(10):  # Wait up to 10 frames for initialization
		await get_tree().process_frame
		if outfit_character.is_appearance_ready():
			break
		outfit_character.show_character()
	
	print("[ItemCaptureUI] Character ready: %s" % outfit_character.is_appearance_ready())
	
	# Hide body mesh and stop animations (show only clothes/accessories)
	outfit_character.set_body_visible(false)
	outfit_character.stop_animations()
	
	# Reset all parts first (set to None/0)
	for category in ["Hair", "Top", "Bottom", "Shoes", "Hat", "Glasses", "Neck"]:
		outfit_character.set_part(category, 0)
		outfit_character.set_part(category + "Variant", 0)
	
	var outfit: Dictionary = OUTFIT_SETS[set_name]
	var loaded_parts := []
	
	for category in outfit.keys():
		var part_data: Dictionary = outfit[category]
		var item_index: int = part_data.get("index", 0)
		var variant_index: int = part_data.get("variant", 0)
		
		# Set the part on ModularCharacter
		outfit_character.set_part(category, item_index)
		outfit_character.set_part(category + "Variant", variant_index)
		loaded_parts.append(category)
	
	await get_tree().process_frame
	
	# Adjust camera for full body view (optional - skip when batch exporting)
	if adjust_camera:
		_camera_distance = 2.5
		_camera_height_offset = 0.3
		distance_slider.value = _camera_distance
		height_slider.value = _camera_height_offset
		_update_camera_for_outfit()
	
	status_label.text = "Loaded: %s (%s)" % [set_name, ", ".join(loaded_parts)]


func _get_items_array_for_category(category: String) -> Array:
	match category:
		"Top": return TOPS
		"Bottom": return BOTTOMS
		"Shoes": return SHOES
		"Hair": return HAIRS
		"Hat": return HATS
		"Glasses": return GLASSES
		"Neck": return NECK
	return []


func _update_camera_for_outfit() -> void:
	## Camera setup for full outfit view (shows full body)
	if not _camera:
		return
	
	var look_at_height := 0.8 + _camera_height_offset  # Center of body
	var angle_rad := deg_to_rad(_camera_angle)
	_camera.position = Vector3(
		sin(angle_rad) * _camera_distance,
		look_at_height + 0.3,
		cos(angle_rad) * _camera_distance
	)
	_camera.look_at(Vector3(0, look_at_height, 0), Vector3.UP)


func _capture_current_outfit() -> void:
	## Capture the currently displayed outfit without reloading
	_ensure_output_folder()
	
	# Resize viewport for capture
	var original_size := preview_viewport.size
	preview_viewport.size = _image_size
	await get_tree().process_frame
	await get_tree().process_frame
	
	var image := preview_viewport.get_texture().get_image()
	
	# Restore viewport size
	preview_viewport.size = original_size
	
	var folder := _output_folder.path_join("outfits")
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(folder))
	
	var filename := "set_%s.png" % _current_outfit_set.to_snake_case()
	var path := folder.path_join(filename)
	image.save_png(path)
	
	status_label.text = "Exported outfit: " + path
	print("[ItemCaptureUI] Exported outfit set: %s" % path)


func _capture_outfit_set(set_name: String) -> void:
	_ensure_output_folder()
	
	# Load the outfit without changing camera (use current camera settings)
	await _load_outfit_set(set_name, false)
	await get_tree().process_frame
	
	# Resize viewport for capture
	var original_size := preview_viewport.size
	preview_viewport.size = _image_size
	await get_tree().process_frame
	await get_tree().process_frame
	
	var image := preview_viewport.get_texture().get_image()
	
	# Restore viewport size
	preview_viewport.size = original_size
	
	var folder := _output_folder.path_join("outfits")
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(folder))
	
	var filename := "set_%s.png" % set_name.to_snake_case()
	var path := folder.path_join(filename)
	image.save_png(path)
	
	status_label.text = "Exported outfit: " + path
	print("[ItemCaptureUI] Exported outfit set: %s" % path)


func _capture_all_outfit_sets() -> void:
	_ensure_output_folder()
	var count := 0
	
	for set_name in OUTFIT_SETS.keys():
		await _capture_outfit_set(set_name)
		count += 1
		status_label.text = "Exporting outfit sets... %d/%d" % [count, OUTFIT_SETS.size()]
	
	status_label.text = "Exported %d outfit sets" % count
