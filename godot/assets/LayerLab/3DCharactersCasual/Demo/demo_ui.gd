extends Control

# UI Controller for Character Demo

@onready var character_viewport = $SubViewportContainer/SubViewport
@onready var animation_label = $AnimationPanel/AnimationLabel
@onready var character_customizer: Node3D

# Part button references
var part_labels = {}

# Animation categories for buttons
var animation_buttons = {
	"Interaction_Item_Put": "Interaction_Item_Put",
	"Interaction_Pickup": "Interaction_Pickup",
	"Interaction_Shovel": "Interaction_Shovel",
	"Interaction_Sickle": "Interaction_Sickle",
	"Emoji_Aghast": "Emoji_Aghast",
	"Emoji_Angry": "Emoji_Angry",
	"Emoji_Applaud": "Emoji_Applaud",
	"Emoji_Be_Bashful": "Emoji_Be_Bashful",
	"Emoji_Cheer": "Emoji_Cheer",
	"Emoji_Cry": "Emoji_Cry"
}

func _ready():
	# Connect to character customizer
	character_customizer = character_viewport.get_node_or_null("CharacterCustomizer")
	if character_customizer:
		character_customizer.part_changed.connect(_on_part_changed)
		character_customizer.animation_changed.connect(_on_animation_changed)
	
	# Set initial animation label
	if animation_label:
		animation_label.text = "Stand_Idle1"

func _on_part_changed(category: String, index: int):
	if part_labels.has(category):
		part_labels[category].text = category + str(index)

func _on_animation_changed(anim_name: String):
	if animation_label:
		animation_label.text = anim_name

func _on_next_pressed(category: String):
	if character_customizer:
		character_customizer.next_part(category)

func _on_prev_pressed(category: String):
	if character_customizer:
		character_customizer.prev_part(category)

func _on_animation_pressed(anim_name: String):
	if character_customizer:
		character_customizer.play_animation(anim_name)
	if animation_label:
		animation_label.text = anim_name

func _on_random_pressed():
	if character_customizer:
		character_customizer.random_character()

func _process(delta):
	# Auto-rotate character slowly
	if character_customizer and character_customizer.character_node:
		# Rotate on mouse drag would go here
		pass

