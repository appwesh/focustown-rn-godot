extends Node3D

# Demo scene setup script
# This script instantiates the ground and character prefabs

func _ready():
	# Load and instantiate the ground
	var ground_scene = load("res://Assets/Layer Lab/3D CharactersCasual/3D Characters Pro-Casual/Prefabs/Ground.prefab.scn")
	if ground_scene:
		var ground_instance = ground_scene.instantiate()
		add_child(ground_instance)
		ground_instance.position = Vector3(0, 0, 0)
	
	# Load and instantiate a few character prefabs in a row
	var character_paths = [
		"res://Assets/Layer Lab/3D CharactersCasual/3D Characters Pro-Casual/Prefabs/Characters/Characters_1.prefab.scn",
		"res://Assets/Layer Lab/3D CharactersCasual/3D Characters Pro-Casual/Prefabs/Characters/Characters_2.prefab.scn",
		"res://Assets/Layer Lab/3D CharactersCasual/3D Characters Pro-Casual/Prefabs/Characters/Characters_3.prefab.scn",
		"res://Assets/Layer Lab/3D CharactersCasual/3D Characters Pro-Casual/Prefabs/Characters/Characters_4.prefab.scn",
		"res://Assets/Layer Lab/3D CharactersCasual/3D Characters Pro-Casual/Prefabs/Characters/Characters_5.prefab.scn"
	]
	
	var spacing = 3.0
	var start_x = -6.0
	
	for i in range(character_paths.size()):
		var char_scene = load(character_paths[i])
		if char_scene:
			var char_instance = char_scene.instantiate()
			add_child(char_instance)
			char_instance.position = Vector3(start_x + i * spacing, 0, 0)

