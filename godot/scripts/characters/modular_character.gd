extends Node3D
class_name ModularCharacter

## Modular character controller for CozyLife asset pack
## Supports skin tones, face textures, clothing, accessories, and animations

signal part_changed(category: String, index: int)
signal animation_changed(animation_name: String)
signal appearance_ready  ## Emitted when character appearance is fully loaded and ready to display

const BASE_CHARACTER_PATH := "res://assets/characters/cozylife/SKM_Human.fbx"
const ANIMATIONS_PATH := "res://assets/characters/cozylife/animations/"
const TEXTURES_PATH := "res://assets/characters/cozylife/textures/"

## Static list of animation files (DirAccess doesn't work in exported builds)
const ANIMATION_FILES: PackedStringArray = [
	"ANIM_Avatar_Axe_Swing_01.fbx",
	"ANIM_Avatar_BoredIdle_01.fbx",
	"ANIM_Avatar_BoredIdle_02.fbx",
	"ANIM_Avatar_BugNet_Swish_01.fbx",
	"ANIM_Avatar_Emote_Angry_Entry.fbx",
	"ANIM_Avatar_Emote_Angry_Loop.fbx",
	"ANIM_Avatar_Emote_Confused_Entry.fbx",
	"ANIM_Avatar_Emote_Confused_Loop.fbx",
	"ANIM_Avatar_Emote_Excited_Entry.fbx",
	"ANIM_Avatar_Emote_Excited_Loop.fbx",
	"ANIM_Avatar_Emote_Happy_Loop.fbx",
	"ANIM_Avatar_Emote_Laughing_Loop.fbx",
	"ANIM_Avatar_Emote_Sad_Entry.fbx",
	"ANIM_Avatar_Emote_Sad_Loop.fbx",
	"ANIM_Avatar_Emote_Shocked_Entry.fbx",
	"ANIM_Avatar_Emote_Shocked_Loop.fbx",
	"ANIM_Avatar_Emote_Waving_Loop.fbx",
	"ANIM_Avatar_FishingRod_Cast_01.fbx",
	"ANIM_Avatar_FishingRod_Cast_Idle_01.fbx",
	"ANIM_Avatar_FishingRod_Reel_01.fbx",
	"ANIM_Avatar_Hold_Axe.fbx",
	"ANIM_Avatar_Hold_BugNet.fbx",
	"ANIM_Avatar_Hold_BugNet_Sneak.fbx",
	"ANIM_Avatar_Hold_FishingRod.fbx",
	"ANIM_Avatar_Hold_Shovel.fbx",
	"ANIM_Avatar_Hold_Sword.fbx",
	"ANIM_Avatar_Idle_F_01.fbx",
	"ANIM_Avatar_Idle_L_01.fbx",
	"ANIM_Avatar_Idle_R_01.fbx",
	"ANIM_Avatar_Idle_Sitting_01.fbx",
	"ANIM_Avatar_Pickup_01.fbx",
	"ANIM_Avatar_Run_F_01.fbx",
	"ANIM_Avatar_Run_L_01.fbx",
	"ANIM_Avatar_Run_R_01.fbx",
	"ANIM_Avatar_Shovel_Dig_01.fbx",
	"ANIM_Avatar_Sword_Attack_01.fbx",
	"ANIM_Avatar_Sword_Attack_02.fbx",
	"ANIM_Avatar_Walk_F_01.fbx",
	"ANIM_Avatar_Walk_L_01.fbx",
	"ANIM_Avatar_Walk_R_01.fbx",
]
const CLOTHES_PATH := "res://assets/characters/cozylife/clothes/"
const CLOTHES_TEXTURES_PATH := "res://assets/characters/cozylife/clothes/textures/"
const HAIRS_PATH := "res://assets/characters/cozylife/hairs/"

## Hat adjustments (scale and height offset)
const HAT_SCALE := Vector3(1.15, 1.15, 1.15)
const HAT_HEIGHT_OFFSET := 0.02

## Per-hat position corrections (for hats with different mesh origins)
## Adjust X (left/right), Y (up/down), Z (forward/back) as needed
const HAT_POSITION_CORRECTIONS := {
	"PartyHat": Vector3(.6, 0.0, 0.0),
}

## Hair color options
const HAIR_COLORS := ["Default", "Black", "Blonde", "Blue", "Cyan", "DarkBrown", "Ginger", "Gray", "Green", "Holo", "LightBrown", "Maroon", "PastelPink", "Pink", "Purple", "Red", "Sunset", "Teal", "Vampy", "White", "Yellow"]

## Hair style folder names (must match HAIRS order)
const HAIR_NAMES := ["", "Afro", "BabyBangs", "LongWavy", "MessyKnotBun", "MessySpiky", "Mullet", "StarBuns", "WavyMiddlePart"]

## Default textures for clothes/accessories (first available texture for each item)
const DEFAULT_TEXTURES := {
	# Tops
	"Tank": "T_TOP_Tank_Black_D.tga",
	"LongSleeve": "T_TOP_LongSleeve_Olive_D.tga",
	"Sweater": "T_TOP_Sweater_BlackStar_D.tga",
	"PuffSleeveDress": "T_TOP_PuffSleeveDress_Olive_D.tga",
	"WarriorTunic": "T_TOP_WarriorTunic_Beige_D.tga",
	"WizardRobe": "T_TOP_WizardRobe_Maroon_D.tga",
	# Bottoms
	"Underwear": "",
	"Shorts": "T_BOTTOM_Shorts_Black_D.tga",
	"Pants": "T_BOTTOM_Pants_Black_D.tga",
	"SkinnyPants": "T_BOTTOM_SkinnyPants_Brown_D.tga",
	"FlarePants": "T_BOTTOM_FlarePants_Black_D.tga",
	"Skirt": "T_BOTTOM_Skirt_BlueFloral_D.tga",
	# Shoes
	"CrewSocks": "T_SHOES_CrewSocks_Black_D.tga",
	"Oxfords": "T_SHOES_Oxfords_Black_D.tga",
	"ChunkyBoots": "T_SHOES_ChunkyBoots_Black_D.tga",
	"RainBoots": "T_SHOES_RainBoots_Black_D.tga",
	"WarriorBoots": "T_SHOES_WarriorBoots_Brown_D.tga",
	"WizardBoots": "T_SHOES_WizardBoots_Brown_D.tga",
	# Hats
	"Cowboy": "T_MISC_Hat_Cowboy_Brown_D.tga",
	"Fisherman": "T_MISC_Hat_Fisherman_Olive_D.tga",
	"PartyHat": "T_MISC_Hat_PartyHat_Blue_D.tga",
	"PatrolCap": "T_MISC_Hat_PatrolCap_GreenCamo_D.tga",
	"PorkPie": "T_MISC_Hat_PorkPie_Black_D.tga",
	"PropellerCap": "T_MISC_Hat_PropellerCap_Rainbow_D.tga",
	"StrawHat": "T_MISC_Hat_StrawHat_White_D.tga",
	"Viking": "T_MISC_Hat_Viking_Blue_D.tga",
	# Glasses
	"Round": "T_MISC_Glasses_Round_Brown_D.tga",
	"Aviator": "T_MISC_Glasses_Aviator_Brown_D.tga",
	"CatEye": "T_MISC_Glasses_CatEye_Black_D.tga",
	"CatEyeSunglasses": "",  # No texture file available
	"HeartSunglasses": "T_MISC_Glasses_HeartSunglasses_Pink_D.tga",
}

## Skin tone textures
const SKIN_TONES := [
	"Skintones/T_BODY_Human_01_D.tga",
	"Skintones/T_BODY_Human_02_D.tga",
	"Skintones/T_BODY_Human_03_D.tga",
	"Skintones/T_BODY_Human_04_D.tga",
	"Skintones/T_BODY_Human_05_D.tga",
	"Skintones/T_BODY_Human_06_D.tga",
	"Skintones/T_BODY_Human_07_D.tga",
	"Skintones/T_BODY_Human_08_D.tga",
	"Skintones/T_BODY_Human_09_D.tga",
	"Skintones/T_BODY_Human_10_D.tga",
]

## Face base textures
const FACES := [
	"Faces/Face01/T_FACE_Human_01_D.tga",
	"Faces/Face02/T_FACE_Human_02_D.tga",
	"Faces/Face03/T_FACE_Human_03_D.tga",
	"Faces/Face04/T_FACE_Human_04_D.tga",
	"Faces/Face05/T_FACE_Human_05_D.tga",
	"Faces/Face06/T_FACE_Human_06_D.tga",
	"Faces/Face07/T_FACE_Human_07_D.tga",
	"Faces/Face08/T_FACE_Human_08_D.tga",
	"Faces/Face09/T_FACE_Human_09_D.tga",
	"Faces/Face10/T_FACE_Human_10_D.tga",
	"Faces/Face11/T_FACE_Human_11_D.tga",
	"Faces/Face12/T_FACE_Human_12_D.tga",
	"Faces/Face13/T_FACE_Human_13_D.tga",
	"Faces/Face14/T_FACE_Human_14_D.tga",
	"Faces/Face15/T_FACE_Human_15_D.tga",
]

const EYE_COLORS := ["Default", "Blue", "DarkBrown", "Green", "LightBrown", "Pink", "Purple", "Red", "Teal", "White", "Yellow"]

## Clothing files (SKM = skinned mesh)
const TOPS := ["", "SKM_TOP_Tank.fbx", "SKM_TOP_LongSleeve.fbx", "SKM_TOP_Sweater.fbx", "SKM_TOP_PuffSleeveDress.fbx", "SKM_TOP_WarriorTunic.fbx", "SKM_TOP_WizardRobe.fbx"]
const BOTTOMS := ["", "SKM_BOTTOM_Underwear.fbx", "SKM_BOTTOM_Shorts.fbx", "SKM_BOTTOM_Pants.fbx", "SKM_BOTTOM_SkinnyPants.fbx", "SKM_BOTTOM_FlarePants.fbx", "SKM_BOTTOM_Skirt.fbx"]
const SHOES := ["", "SKM_SHOES_CrewSocks.fbx", "SKM_SHOES_Oxfords.fbx", "SKM_SHOES_ChunkyBoots.fbx", "SKM_SHOES_RainBoots.fbx", "SKM_SHOES_WarriorBoots.fbx", "SKM_SHOES_WizardBoots.fbx"]

## Accessories (SM = static mesh, attach to bone)
const HAIRS := ["", "Afro/SM_HAIR_Afro.fbx", "BabyBangs/SM_HAIR_BabyBangs.fbx", "LongWavy/SM_HAIR_LongWavy.fbx", "MessyKnotBun/SM_HAIR_MessyKnotBun.fbx", "MessySpiky/SM_HAIR_MessySpiky.fbx", "Mullet/SM_HAIR_Mullet.fbx", "StarBuns/SM_HAIR_StarBuns.fbx", "WavyMiddlePart/SM_HAIR_WavyMiddlePart.fbx"]
const HATS := ["", "SM_MISC_Hat_Cowboy.fbx", "SM_MISC_Hat_Fisherman.fbx", "SM_MISC_Hat_PartyHat.fbx", "SM_MISC_Hat_PatrolCap.fbx", "SM_MISC_Hat_PorkPie.fbx", "SM_MISC_Hat_PropellerCap.fbx", "SM_MISC_Hat_StrawHat.fbx", "SM_MISC_Hat_Viking.fbx"]
const GLASSES := ["", "SM_MISC_Glasses_Round.fbx", "SM_MISC_Glasses_Aviator.fbx", "SM_MISC_Glasses_CatEye.fbx", "SM_MISC_Glasses_CatEyeSunglasses.fbx", "SM_MISC_Glasses_HeartSunglasses.fbx"]

## Part definitions for UI
const PARTS := {
	"SkinTone": ["Skin 1", "Skin 2", "Skin 3", "Skin 4", "Skin 5", "Skin 6", "Skin 7", "Skin 8", "Skin 9", "Skin 10"],
	"Face": ["Face 1", "Face 2", "Face 3", "Face 4", "Face 5", "Face 6", "Face 7", "Face 8", "Face 9", "Face 10", "Face 11", "Face 12", "Face 13", "Face 14", "Face 15"],
	"EyeColor": EYE_COLORS,
	"Hair": ["None", "Afro", "BabyBangs", "LongWavy", "MessyKnotBun", "MessySpiky", "Mullet", "StarBuns", "WavyMiddlePart"],
	"HairColor": HAIR_COLORS,
	"Top": ["None", "Tank", "LongSleeve", "Sweater", "PuffSleeveDress", "WarriorTunic", "WizardRobe"],
	"Bottom": ["None", "Underwear", "Shorts", "Pants", "SkinnyPants", "FlarePants", "Skirt"],
	"Shoes": ["None", "CrewSocks", "Oxfords", "ChunkyBoots", "RainBoots", "WarriorBoots", "WizardBoots"],
	"Hat": ["None", "Cowboy", "Fisherman", "PartyHat", "PatrolCap", "PorkPie", "PropellerCap", "StrawHat", "Viking"],
	"Glasses": ["None", "Round", "Aviator", "CatEye", "CatEyeSunglasses", "HeartSunglasses"],
}

const PART_DISPLAY_NAMES := {
	"SkinTone": "Skin Tone",
	"Face": "Face",
	"EyeColor": "Eye Color",
	"Hair": "Hair Style",
	"HairColor": "Hair Color",
	"Top": "Top",
	"Bottom": "Bottom",
	"Shoes": "Shoes",
	"Hat": "Hat",
	"Glasses": "Glasses",
}

const UI_CATEGORIES := {
	"Body": ["SkinTone", "Face", "EyeColor"],
	"Clothes": ["Top", "Bottom", "Shoes"],
	"Accessories": ["Hair", "HairColor", "Hat", "Glasses"],
}

@export var default_selections: Dictionary = {
	"SkinTone": 0,
	"Face": 0,
	"EyeColor": 0,
	"Hair": 1,
	"HairColor": 0,
	"Top": 1,
	"Bottom": 3,
	"Shoes": 2,
	"Hat": 0,
	"Glasses": 0,
}

var _base_model: Node3D
var _skeleton: Skeleton3D
var _anim_player: AnimationPlayer
var _mesh_instance: MeshInstance3D
var _body_material: StandardMaterial3D
var _face_material: StandardMaterial3D
var _current_selections: Dictionary = {}
var _all_animations: Array[String] = []
var _equipped_parts: Dictionary = {}  # category -> Node3D instance
var _head_attachment: BoneAttachment3D
var _is_appearance_ready: bool = false  ## Whether appearance has been fully loaded
var _color_modulate: Color = Color.WHITE  ## Color modulation for darkening effect


func _ready() -> void:
	_current_selections = default_selections.duplicate()
	_load_base_character()
	
	# Hide character until appearance is explicitly shown
	# The parent (e.g., HomeCharacterShowcase) should call show_character() after applying appearance
	if _base_model:
		_base_model.visible = false
	
	_setup_materials()
	_setup_bone_attachments()
	_load_all_animations()
	_apply_textures()
	_apply_all_parts()
	call_deferred("_play_default_animation")
	# Don't auto-show - let parent control visibility after customization


func _load_base_character() -> void:
	var base_scene := load(BASE_CHARACTER_PATH) as PackedScene
	if not base_scene:
		push_error("[ModularCharacter] Failed to load: ", BASE_CHARACTER_PATH)
		return
	
	_base_model = base_scene.instantiate()
	_base_model.name = "BaseCharacter"
	add_child(_base_model)
	
	# Find skeleton
	_skeleton = _find_node_of_type(_base_model, Skeleton3D) as Skeleton3D
	if _skeleton:
		print("[ModularCharacter] Found skeleton: ", _skeleton.name)
	
	# Find AnimationPlayer
	_anim_player = _find_node_of_type(_base_model, AnimationPlayer) as AnimationPlayer
	if _anim_player:
		print("[ModularCharacter] Found AnimationPlayer: ", _anim_player.name)
	else:
		_anim_player = AnimationPlayer.new()
		_anim_player.name = "AnimationPlayer"
		_base_model.add_child(_anim_player)
		print("[ModularCharacter] Created new AnimationPlayer")
	
	# Find main mesh
	_mesh_instance = _find_node_of_type(_base_model, MeshInstance3D) as MeshInstance3D
	if _mesh_instance:
		print("[ModularCharacter] Found mesh: ", _mesh_instance.name)


func _setup_bone_attachments() -> void:
	if not _skeleton:
		print("[ModularCharacter] No skeleton - cannot create bone attachments")
		return
	
	# Find head bone for accessories
	var head_bone_name := ""
	for i in range(_skeleton.get_bone_count()):
		var bone_name := _skeleton.get_bone_name(i)
		if "head" in bone_name.to_lower():
			head_bone_name = bone_name
			print("[ModularCharacter] Found head bone: %s (index %d)" % [bone_name, i])
			break
	
	if not head_bone_name.is_empty():
		_head_attachment = BoneAttachment3D.new()
		_head_attachment.name = "HeadAttachment"
		_head_attachment.bone_name = head_bone_name
		_skeleton.add_child(_head_attachment)
		print("[ModularCharacter] Created head attachment for bone: %s" % head_bone_name)


func _setup_materials() -> void:
	if not _mesh_instance:
		return
	
	var surface_count := _mesh_instance.get_surface_override_material_count()
	print("[ModularCharacter] Mesh has %d surfaces" % surface_count)
	
	# Body material
	_body_material = StandardMaterial3D.new()
	_body_material.albedo_color = Color.WHITE
	
	# Face material with alpha
	_face_material = StandardMaterial3D.new()
	_face_material.albedo_color = Color.WHITE
	_face_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	
	if surface_count >= 1:
		_mesh_instance.set_surface_override_material(0, _body_material)
	
	if surface_count >= 2:
		for i in range(1, surface_count):
			var face_mat := StandardMaterial3D.new()
			face_mat.albedo_color = Color.WHITE
			face_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
			_mesh_instance.set_surface_override_material(i, face_mat)
		_face_material = _mesh_instance.get_surface_override_material(1) as StandardMaterial3D


func _apply_textures() -> void:
	_apply_skin_tone(_current_selections.get("SkinTone", 0))
	_apply_face(_current_selections.get("Face", 0), _current_selections.get("EyeColor", 0))


func _apply_all_parts() -> void:
	for category in ["Hair", "Top", "Bottom", "Shoes", "Hat", "Glasses"]:
		_equip_part(category, _current_selections.get(category, 0))


func _apply_skin_tone(index: int) -> void:
	if not _body_material or index < 0 or index >= SKIN_TONES.size():
		return
	var texture_path: String = TEXTURES_PATH + SKIN_TONES[index]
	var texture := load(texture_path) as Texture2D
	if texture:
		_body_material.albedo_texture = texture


func _apply_face(face_index: int, eye_color_index: int) -> void:
	if not _mesh_instance or face_index < 0 or face_index >= FACES.size():
		return
	
	var texture_path: String
	var face_num := face_index + 1
	var face_folder := "Faces/Face%02d/" % face_num
	
	if eye_color_index == 0:
		texture_path = TEXTURES_PATH + FACES[face_index]
	else:
		var color_name: String = EYE_COLORS[eye_color_index]
		texture_path = TEXTURES_PATH + face_folder + "ColorVariations/T_FACE_Human_%02d_%s_D.tga" % [face_num, color_name]
	
	var texture := load(texture_path) as Texture2D
	if not texture:
		texture_path = TEXTURES_PATH + FACES[face_index]
		texture = load(texture_path) as Texture2D
	
	if texture:
		var surface_count := _mesh_instance.get_surface_override_material_count()
		for i in range(1, surface_count):
			var mat := _mesh_instance.get_surface_override_material(i) as StandardMaterial3D
			if mat:
				mat.albedo_texture = texture
				mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA


func _equip_part(category: String, index: int) -> void:
	# Remove existing part
	if _equipped_parts.has(category) and is_instance_valid(_equipped_parts[category]):
		_equipped_parts[category].queue_free()
		_equipped_parts.erase(category)
	
	# Get file path based on category
	var file_path: String = ""
	var base_path: String = CLOTHES_PATH
	
	match category:
		"Top":
			if index >= 0 and index < TOPS.size():
				file_path = TOPS[index]
		"Bottom":
			if index >= 0 and index < BOTTOMS.size():
				file_path = BOTTOMS[index]
		"Shoes":
			if index >= 0 and index < SHOES.size():
				file_path = SHOES[index]
		"Hair":
			if index >= 0 and index < HAIRS.size():
				file_path = HAIRS[index]
				base_path = HAIRS_PATH
		"Hat":
			if index >= 0 and index < HATS.size():
				file_path = HATS[index]
		"Glasses":
			if index >= 0 and index < GLASSES.size():
				file_path = GLASSES[index]
	
	# Empty path means "None" option
	if file_path.is_empty():
		_current_selections[category] = index
		return
	
	var full_path: String = base_path + file_path
	var part_scene := load(full_path) as PackedScene
	if not part_scene:
		print("[ModularCharacter] Failed to load: ", full_path)
		return
	
	var part_instance := part_scene.instantiate()
	
	# Check if this is a skinned mesh (clothing) or static mesh (accessory)
	var is_head_accessory := category in ["Hair", "Hat", "Glasses"]
	var is_skinned := file_path.begins_with("SKM_")
	
	if is_skinned and _skeleton:
		# For skinned meshes, extract the mesh and add to our skeleton
		var equipped := _attach_skinned_mesh(part_instance, category)
		if equipped:
			_equipped_parts[category] = equipped
			# Apply texture to skinned mesh
			var part_name: String = PARTS[category][index]
			_apply_part_texture(equipped, part_name)
		part_instance.queue_free()
	elif is_head_accessory and _head_attachment:
		# Static mesh - attach to head bone
		# Per CozyLife docs: SM_ assets should be parented to Head_M joint
		# Vertices are in world space; BoneAttachment handles positioning
		var mesh_node := _find_node_of_type(part_instance, MeshInstance3D) as MeshInstance3D
		if mesh_node:
			var new_mesh := MeshInstance3D.new()
			new_mesh.name = category + "_Part"
			new_mesh.mesh = mesh_node.mesh
			
			# Only apply inverse rotation to counter bone's rest orientation
			# No position offset needed - BoneAttachment positions at bone, vertices already offset
			var head_bone_idx := _skeleton.find_bone("Head_M")
			if head_bone_idx >= 0:
				var bone_rest := _skeleton.get_bone_global_rest(head_bone_idx)
				new_mesh.basis = bone_rest.basis.inverse()
			
			# For hats, make them bigger and higher
			if category == "Hat":
				new_mesh.scale = HAT_SCALE
				new_mesh.position.y += HAT_HEIGHT_OFFSET
				# Apply per-hat position correction if needed
				var hat_name: String = PARTS["Hat"][index]
				if HAT_POSITION_CORRECTIONS.has(hat_name):
					new_mesh.position += HAT_POSITION_CORRECTIONS[hat_name]
			
			_head_attachment.add_child(new_mesh)
			_equipped_parts[category] = new_mesh
			
			# Apply textures based on category
			var part_name: String = PARTS[category][index]
			if category == "Hair":
				_apply_hair_texture(new_mesh)
			else:
				_apply_part_texture(new_mesh, part_name)
			
			part_instance.queue_free()
		else:
			part_instance.name = category + "_Part"
			_head_attachment.add_child(part_instance)
			_equipped_parts[category] = part_instance
		
		print("[ModularCharacter] Attached %s to head" % category)
	else:
		part_instance.name = category + "_Part"
		add_child(part_instance)
		_equipped_parts[category] = part_instance
	
	_current_selections[category] = index


func _attach_skinned_mesh(source_scene: Node, category: String) -> Node3D:
	## Extract mesh from imported FBX and attach to our skeleton
	## This makes the clothing animate with the character
	
	# Find the MeshInstance3D in the source scene
	var source_mesh := _find_node_of_type(source_scene, MeshInstance3D) as MeshInstance3D
	if not source_mesh:
		print("[ModularCharacter] No mesh found in %s" % category)
		return null
	
	# Duplicate the mesh instance
	var new_mesh := MeshInstance3D.new()
	new_mesh.name = category + "_Mesh"
	new_mesh.mesh = source_mesh.mesh
	new_mesh.skin = source_mesh.skin
	
	# Add to our skeleton so it uses the same bones
	_skeleton.add_child(new_mesh)
	
	# Set skeleton path to use our skeleton
	new_mesh.skeleton = NodePath("..")
	
	print("[ModularCharacter] Attached skinned %s mesh to skeleton" % category)
	return new_mesh


func _apply_part_texture(mesh: MeshInstance3D, part_name: String) -> void:
	## Apply texture to a mesh based on part name using DEFAULT_TEXTURES
	if not mesh or part_name.is_empty():
		return
	
	var texture_file: String = DEFAULT_TEXTURES.get(part_name, "")
	if texture_file.is_empty():
		return
	
	var texture_path: String = CLOTHES_TEXTURES_PATH + texture_file
	var texture := load(texture_path) as Texture2D
	if not texture:
		print("[ModularCharacter] Failed to load texture: ", texture_path)
		return
	
	# Create material and apply texture
	var material := StandardMaterial3D.new()
	material.albedo_texture = texture
	mesh.material_override = material
	print("[ModularCharacter] Applied texture %s to %s" % [texture_file, part_name])


func _apply_hair_texture(mesh: MeshInstance3D) -> void:
	## Apply hair texture based on current hair style and color
	if not mesh:
		return
	
	var hair_index: int = _current_selections.get("Hair", 0)
	var color_index: int = _current_selections.get("HairColor", 0)
	
	if hair_index <= 0 or hair_index >= HAIR_NAMES.size():
		return
	
	var hair_name: String = HAIR_NAMES[hair_index]
	var color_name: String = HAIR_COLORS[color_index] if color_index < HAIR_COLORS.size() else "Default"
	
	# Build texture path
	var texture_path: String
	if color_name == "Default" or color_index == 0:
		# Use base texture
		texture_path = HAIRS_PATH + hair_name + "/T_HAIR_" + hair_name + "_D.tga"
	else:
		# Use color variation
		texture_path = HAIRS_PATH + hair_name + "/ColorVariations/T_HAIR_" + hair_name + "_" + color_name + "_D.tga"
	
	var texture := load(texture_path) as Texture2D
	if not texture:
		# Fallback to default
		texture_path = HAIRS_PATH + hair_name + "/T_HAIR_" + hair_name + "_D.tga"
		texture = load(texture_path) as Texture2D
	
	if not texture:
		print("[ModularCharacter] Failed to load hair texture: ", texture_path)
		return
	
	# Also try to load normal map
	var normal_path: String = HAIRS_PATH + hair_name + "/T_HAIR_" + hair_name + "_N.tga"
	var normal_texture := load(normal_path) as Texture2D
	
	# Create material and apply textures
	var material := StandardMaterial3D.new()
	material.albedo_texture = texture
	if normal_texture:
		material.normal_enabled = true
		material.normal_texture = normal_texture
	mesh.material_override = material
	print("[ModularCharacter] Applied hair texture: %s (color: %s)" % [hair_name, color_name])


func _update_hair_color() -> void:
	## Update hair color without re-equipping the mesh
	if not _equipped_parts.has("Hair"):
		return
	
	var hair_mesh := _equipped_parts.get("Hair") as MeshInstance3D
	if hair_mesh:
		_apply_hair_texture(hair_mesh)


func _load_all_animations() -> void:
	if not _anim_player:
		return
	
	# Use static list instead of DirAccess (DirAccess doesn't work in exported builds)
	for file_name in ANIMATION_FILES:
		var path := ANIMATIONS_PATH + file_name
		var lib := load(path) as AnimationLibrary
		if lib:
			# Fix animation track paths that have "Armature/" prefix
			_remap_animation_library_paths(lib)
			var lib_name := file_name.replace(".fbx", "").replace("ANIM_Avatar_", "")
			if not _anim_player.has_animation_library(lib_name):
				_anim_player.add_animation_library(lib_name, lib)
	
	_all_animations.assign(_anim_player.get_animation_list())
	_all_animations.sort()
	print("[ModularCharacter] Loaded %d animations" % _all_animations.size())


func _remap_animation_library_paths(lib: AnimationLibrary) -> void:
	## Fix animation track paths that have "Armature/" prefix (from Blender exports)
	## Our skeleton is at Skeleton3D, not Armature/Skeleton3D
	for anim_name in lib.get_animation_list():
		var anim := lib.get_animation(anim_name)
		if not anim:
			continue
		
		var needs_fix := false
		for track_idx in range(anim.get_track_count()):
			var track_path := anim.track_get_path(track_idx)
			var path_str := str(track_path)
			if path_str.begins_with("Armature/"):
				needs_fix = true
				break
		
		if needs_fix:
			for track_idx in range(anim.get_track_count()):
				var track_path := anim.track_get_path(track_idx)
				var path_str := str(track_path)
				if path_str.begins_with("Armature/"):
					# Remove "Armature/" prefix
					var new_path := path_str.substr(9)  # len("Armature/") = 9
					anim.track_set_path(track_idx, NodePath(new_path))
			print("[ModularCharacter] Remapped track paths for: %s" % anim_name)


func _play_default_animation() -> void:
	play_animation("Idle_F")


## Animation

func play_animation(anim_name: String) -> void:
	if not _anim_player:
		return
	for anim in _all_animations:
		if anim_name.to_lower() in anim.to_lower():
			# Ensure animation loops
			var anim_parts := anim.split("/")
			if anim_parts.size() == 2:
				var lib_name := anim_parts[0]
				var anim_key := anim_parts[1]
				var lib := _anim_player.get_animation_library(lib_name)
				if lib:
					var animation := lib.get_animation(anim_key)
					if animation:
						animation.loop_mode = Animation.LOOP_LINEAR
			_anim_player.play(anim)
			animation_changed.emit(anim)
			return


func get_animation_list() -> Array[String]:
	return _all_animations


func get_animation_categories() -> Dictionary:
	return {
		"Idle": ["Idle_F", "Idle_L", "Idle_R", "BoredIdle_01", "BoredIdle_02"],
		"Sitting": ["Idle_Sitting_01"],
		"Movement": ["Walk_F", "Walk_L", "Walk_R", "Run_F", "Run_L", "Run_R"],
		"Emotes": ["Emote_Waving_Loop", "Emote_Happy_Loop", "Emote_Excited_Loop", "Emote_Sad_Loop"],
		"Actions": ["Pickup_01", "Axe_Swing_01", "Shovel_Dig_01"],
	}


## Get the AnimationPlayer for external control
func get_animation_player() -> AnimationPlayer:
	return _anim_player


## Part Selection

func set_part(category: String, index: int) -> void:
	_current_selections[category] = index
	
	match category:
		"SkinTone":
			_apply_skin_tone(index)
		"Face", "EyeColor":
			_apply_face(_current_selections.get("Face", 0), _current_selections.get("EyeColor", 0))
		"HairColor":
			_update_hair_color()
		"Hair", "Top", "Bottom", "Shoes", "Hat", "Glasses":
			_equip_part(category, index)
	
	part_changed.emit(category, index)


func get_part(category: String) -> int:
	return _current_selections.get(category, 0)


func get_part_count(category: String) -> int:
	return PARTS.get(category, []).size()


func get_part_name(category: String, index: int) -> String:
	var parts: Array = PARTS.get(category, [])
	return parts[index] if index >= 0 and index < parts.size() else ""


func next_part(category: String) -> void:
	set_part(category, (get_part(category) + 1) % get_part_count(category))


func previous_part(category: String) -> void:
	var count := get_part_count(category)
	set_part(category, (get_part(category) - 1 + count) % count)


func randomize_appearance() -> void:
	for category in PARTS.keys():
		if category == "Hat":
			continue  # Skip hats when randomizing
		set_part(category, randi() % get_part_count(category))


func get_available_categories() -> Array[String]:
	var categories: Array[String] = []
	categories.assign(PARTS.keys())
	return categories


## Appearance Ready State

func show_character() -> void:
	## Call this after appearance customization is complete to show the character
	_is_appearance_ready = true
	if _base_model:
		_base_model.visible = true
	appearance_ready.emit()


func hide_character() -> void:
	## Hide the character (e.g., during appearance changes)
	if _base_model:
		_base_model.visible = false


func is_appearance_ready() -> bool:
	return _is_appearance_ready


func set_character_visible(is_visible: bool) -> void:
	if _base_model:
		_base_model.visible = is_visible


## Set color modulation (for darkening back row characters)
## Uses a multiply shader to properly darken textured materials
func set_color_modulate(color: Color) -> void:
	_color_modulate = color
	_apply_color_modulate()


func _apply_color_modulate() -> void:
	## Apply color modulation using next_pass shader for proper darkening
	var darken_shader: Shader = preload("res://shaders/darken_overlay.gdshader")
	var darken_material: ShaderMaterial = null
	
	# Only create the darken material if we're actually darkening (not white)
	if _color_modulate != Color.WHITE:
		darken_material = ShaderMaterial.new()
		darken_material.shader = darken_shader
		darken_material.set_shader_parameter("darken_color", _color_modulate)
	
	# Apply to body material
	if _body_material:
		_body_material.next_pass = darken_material
	
	# Apply to face materials - use albedo_color directly since faces have alpha transparency
	# (next_pass doesn't work well with transparent materials)
	if _mesh_instance:
		var surface_count := _mesh_instance.get_surface_override_material_count()
		for i in range(1, surface_count):
			var mat := _mesh_instance.get_surface_override_material(i) as StandardMaterial3D
			if mat:
				# Face materials start as white, so multiply works correctly
				mat.albedo_color = _color_modulate
	
	# Apply to equipped parts
	for category in _equipped_parts:
		var part := _equipped_parts[category] as MeshInstance3D
		if part and part.material_override:
			var mat := part.material_override as StandardMaterial3D
			if mat:
				mat.next_pass = darken_material


## Save/Load

func save_to_dict() -> Dictionary:
	return _current_selections.duplicate()


func load_from_dict(data: Dictionary) -> void:
	for category in data.keys():
		set_part(category, data[category])


## Helpers

func _find_node_of_type(node: Node, type) -> Node:
	if is_instance_of(node, type):
		return node
	for child in node.get_children():
		var found := _find_node_of_type(child, type)
		if found:
			return found
	return null
