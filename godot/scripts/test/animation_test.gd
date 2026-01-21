extends Node3D

## Full Animation Test UI
## Arrow keys to cycle animations, Space to toggle loop, Enter to play once

const ANIMATION_PATH = "res://assets/characters/cozylife/animations/"

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

var anim_player: AnimationPlayer
var all_animations: Array[String] = []
var current_index := 0
var is_looping := true

# UI elements
var label: Label

func _ready() -> void:
	anim_player = _find_animation_player(self)
	if not anim_player:
		print("No AnimationPlayer found!")
		return
	
	_load_all_animations()
	_create_ui()
	
	# Play idle by default
	_play_animation_containing("Idle_F")

func _load_all_animations() -> void:
	print("Loading all animation libraries...")
	
	# Use static list instead of DirAccess (DirAccess doesn't work in exported builds)
	for file_name in ANIMATION_FILES:
		var path = ANIMATION_PATH + file_name
		var lib = load(path) as AnimationLibrary
		if lib:
			var lib_name = file_name.replace(".fbx", "").replace("ANIM_Avatar_", "")
			anim_player.add_animation_library(lib_name, lib)
	
	all_animations.assign(anim_player.get_animation_list())
	all_animations.sort()
	
	print("Loaded ", all_animations.size(), " animations:")
	for anim in all_animations:
		print("  - ", anim)

func _create_ui() -> void:
	# Create a CanvasLayer for UI
	var canvas = CanvasLayer.new()
	add_child(canvas)
	
	# Background panel
	var panel = PanelContainer.new()
	panel.position = Vector2(10, 10)
	canvas.add_child(panel)
	
	var vbox = VBoxContainer.new()
	panel.add_child(vbox)
	
	# Title
	var title = Label.new()
	title.text = "Animation Tester"
	title.add_theme_font_size_override("font_size", 20)
	vbox.add_child(title)
	
	# Current animation label
	label = Label.new()
	label.custom_minimum_size = Vector2(300, 0)
	vbox.add_child(label)
	
	# Controls help
	var help = Label.new()
	help.text = "\nControls:\n← → : Change animation\n↑ ↓ : Jump 10 animations\nSpace: Toggle loop\nEnter: Play once\n1-9: Quick select"
	help.add_theme_font_size_override("font_size", 12)
	vbox.add_child(help)
	
	_update_label()

func _update_label() -> void:
	if label and all_animations.size() > 0:
		var anim_name = all_animations[current_index]
		var loop_text = " [LOOP]" if is_looping else " [ONCE]"
		label.text = "(%d/%d)%s\n%s" % [current_index + 1, all_animations.size(), loop_text, anim_name]

func _input(event: InputEvent) -> void:
	if not anim_player or all_animations.size() == 0:
		return
	
	if event is InputEventKey and event.pressed:
		match event.keycode:
			KEY_RIGHT:
				current_index = (current_index + 1) % all_animations.size()
				_play_current()
			KEY_LEFT:
				current_index = (current_index - 1 + all_animations.size()) % all_animations.size()
				_play_current()
			KEY_DOWN:
				current_index = (current_index + 10) % all_animations.size()
				_play_current()
			KEY_UP:
				current_index = (current_index - 10 + all_animations.size()) % all_animations.size()
				_play_current()
			KEY_SPACE:
				is_looping = not is_looping
				_play_current()
			KEY_ENTER:
				anim_player.play(all_animations[current_index])
			KEY_1:
				_play_animation_containing("Idle_F")
			KEY_2:
				_play_animation_containing("Walk_F")
			KEY_3:
				_play_animation_containing("Run_F")
			KEY_4:
				_play_animation_containing("Waving")
			KEY_5:
				_play_animation_containing("Happy")
			KEY_6:
				_play_animation_containing("Pickup")
			KEY_7:
				_play_animation_containing("Excited")
			KEY_8:
				_play_animation_containing("Sad")
			KEY_9:
				_play_animation_containing("BoredIdle")

func _play_current() -> void:
	if current_index >= 0 and current_index < all_animations.size():
		var anim_name = all_animations[current_index]
		if is_looping:
			anim_player.play(anim_name, -1, 1.0, false)
		else:
			anim_player.play(anim_name)
		_update_label()
		print("Playing: ", anim_name)

func _play_animation_containing(search: String) -> void:
	for i in range(all_animations.size()):
		if search.to_lower() in all_animations[i].to_lower():
			current_index = i
			is_looping = true
			_play_current()
			return
	print("Animation not found containing: ", search)

func _find_animation_player(node: Node) -> AnimationPlayer:
	if node is AnimationPlayer:
		return node
	for child in node.get_children():
		var result = _find_animation_player(child)
		if result:
			return result
	return null
