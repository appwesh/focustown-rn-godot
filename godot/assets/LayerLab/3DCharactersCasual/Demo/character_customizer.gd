extends Node3D

# Character Customization Demo Script
# Manages character parts and animations

signal part_changed(category: String, index: int)
signal animation_changed(anim_name: String)

# Part categories with their counts
var part_counts = {
	"Hair": 28,
	"Face": 12,  # Eye variations
	"Eyebrow": 23,
	"Top": 20,
	"Glove": 22,
	"Bottom": 55,
	"Shoes": 30,
	"Bag": 18,
	"Eyewear": 18
}

# Current part indices
var current_parts = {
	"Hair": 1,
	"Face": 1,
	"Eyebrow": 1,
	"Top": 1,
	"Glove": 0,  # 0 = none
	"Bottom": 1,
	"Shoes": 1,
	"Bag": 0,  # 0 = none
	"Eyewear": 0  # 0 = none
}

# Animation categories
var animations = {
	"Idle": ["Stand_Idle1", "Stand_Idle2", "Stand_idle3", "Stand_Idle4", "Stand_Idle5", "Stand_Idle6"],
	"Action": ["Action_Jump", "Action_Punch", "Action_Run", "Action_Walk"],
	"Dance": ["Dance_1", "Dance_2", "Dance_3", "Dance_4"],
	"Emoji": ["Emoji_Aghast", "Emoji_Angry", "Emoji_Applaud", "Emoji_Be_Bashful", "Emoji_Cheer", "Emoji_Cry", "Emoji_Gas", "Emoji_Hi", "Emoji_Nice", "Emoji_Pester", "Emoji_Putter_Around", "Emoji_Showmanship", "Emoji_SideToSide", "Emoji_Sigh", "Emoji_Smile1", "Emoji_Smile2"],
	"Interaction": ["Interaction_Item_Put", "Interaction_Pickup", "Interaction_Shovel", "Interaction_Sickle"],
	"Reaction": ["Reaction_Agonize", "Reaction_Knockout", "Reaction_Struck"]
}

var current_animation = "Stand_Idle1"
var animation_player: AnimationPlayer
var character_node: Node3D

# Paths
const PARTS_PATH = "res://Assets/Layer Lab/3D CharactersCasual/3D Characters Pro-Casual/FBX/Parts/"
const ANIM_PATH = "res://Assets/Layer Lab/3D CharactersCasual/Animation/"
const PREVIEW_PATH = "res://Assets/Layer Lab/3D CharactersCasual/3D Characters Pro-Casual/FBX/Preview/"

func _ready():
	# Load initial character (using preview model which has textures)
	load_preview_character()

func load_preview_character():
	# Load a preview character that has embedded textures
	var preview_scene = load(PREVIEW_PATH + "Pose_Preview_01.fbx")
	if preview_scene:
		character_node = preview_scene.instantiate()
		character_node.name = "Character"
		add_child(character_node)
		
		# Find animation player if exists
		animation_player = character_node.get_node_or_null("AnimationPlayer")

func next_part(category: String):
	if current_parts.has(category):
		var max_count = part_counts.get(category, 1)
		current_parts[category] = (current_parts[category] % max_count) + 1
		emit_signal("part_changed", category, current_parts[category])
		# In a full implementation, this would swap the mesh

func prev_part(category: String):
	if current_parts.has(category):
		var max_count = part_counts.get(category, 1)
		current_parts[category] -= 1
		if current_parts[category] < 1:
			current_parts[category] = max_count
		emit_signal("part_changed", category, current_parts[category])

func get_part_label(category: String) -> String:
	return category + str(current_parts.get(category, 1))

func play_animation(anim_name: String):
	current_animation = anim_name
	emit_signal("animation_changed", anim_name)
	# Animation would be loaded and played here

func random_character():
	for category in current_parts.keys():
		var max_count = part_counts.get(category, 1)
		current_parts[category] = randi_range(1, max_count)
		emit_signal("part_changed", category, current_parts[category])

func rotate_character(delta: float):
	if character_node:
		character_node.rotate_y(delta)

