extends Node
@onready var capybara_intro_animations: AnimationPlayer = $"../Characters/Capybara/CapybaraIntroAnimations"
@onready var camera_animations: AnimationPlayer = $"../Camera3D/CameraAnimations"


func _on_texture_button_pressed() -> void:
	camera_animations.play("cam_intro_2")
	capybara_intro_animations.play("intro_capybara_2")
