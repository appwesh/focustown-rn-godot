extends Control
class_name InteractionPrompt

@onready var label: Label = $Panel/Label
@onready var animation_player: AnimationPlayer = $AnimationPlayer


func _ready() -> void:
	visible = false


func show_prompt(target: Node3D = null, text: String = "Press E") -> void:
	label.text = text
	visible = true
	if animation_player:
		animation_player.play("bounce")


func hide_prompt() -> void:
	visible = false
