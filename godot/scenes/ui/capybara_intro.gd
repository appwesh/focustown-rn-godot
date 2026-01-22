extends Control

@onready var button_animator: AnimationPlayer = $TextureButton/ButtonAnimator
@onready var bubble_text: Label = $BubbleTexture/BubbleText
@onready var texture_button: TextureButton = $TextureButton
@onready var bubble_texture: TextureRect = $BubbleTexture
@onready var bubble_animator: AnimationPlayer = $BubbleTexture/BubbleAnimator


# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	pass

func _enable_big_button() -> void:
	texture_button.visible = true
	button_animator.play("EnableButton")


func _on_texture_button_pressed() -> void:
	button_animator.play("DisableButton")

func _enable_text_bubble(text: String) -> void:
	bubble_texture.visible = true
	bubble_animator.play("PopUp")
	bubble_text.text = text

func _disable_text_bubble() -> void:
	bubble_animator.play("PopOut")
