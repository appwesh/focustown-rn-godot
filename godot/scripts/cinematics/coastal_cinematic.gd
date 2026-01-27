extends BaseCinematic
class_name CoastalCinematic

## Coastal Cafe cinematic scene controller
## Extends BaseCinematic with coastal-specific study spot and NPC configurations


# =============================================================================
# Virtual Method Overrides
# =============================================================================

func _get_scene_name() -> String:
	return "Coastal"


func _get_building_id() -> String:
	return "coastal"


func _get_building_name() -> String:
	return "Coastal Cafe"


func _register_with_rnbridge() -> void:
	## Register this scene with RNBridge to receive character updates
	if RNBridge:
		RNBridge.register_coastal_cinematic(self)
		print("[CoastalCinematic] Registered with RNBridge")


func _get_default_npc_configs() -> Array[Dictionary]:
	## Default NPC configurations for coastal cafe
	## Positions are placeholders - adjust based on actual cafe chair locations
	var configs: Array[Dictionary] = []
	
	# NPC sitting at cafe table 1
	configs.append({
		"position": Vector3(-2.0, 0, 1.0),
		"rotation": 90.0,
		"animation": "SITTING_USING_LAPTOP_02"
	})
	
	# NPC sitting at cafe table 2
	configs.append({
		"position": Vector3(2.0, 0, 1.0),
		"rotation": -90.0,
		"animation": "SITTING_USING_LAPTOP_02"
	})
	
	# NPC standing near the counter
	configs.append({
		"position": Vector3(0, 0, -2.0),
		"rotation": 0.0,
		"animation": "BoredIdle_02"
	})
	
	return configs


func _get_default_study_spots() -> Array[Dictionary]:
	## Define study spot positions in the coastal cafe
	## Positions are placeholders - adjust based on actual cafe chair locations
	var spots: Array[Dictionary] = []
	
	# Cafe table chairs - placeholder positions
	var cafe_chairs := [
		{"pos": Vector3(-2.0, 0, 1.0), "rot": 90.0},
		{"pos": Vector3(-2.0, 0, 2.5), "rot": 90.0},
		{"pos": Vector3(2.0, 0, 1.0), "rot": -90.0},
		{"pos": Vector3(2.0, 0, 2.5), "rot": -90.0},
		{"pos": Vector3(0, 0, 0), "rot": 0.0},
		{"pos": Vector3(0, 0, 3.0), "rot": 180.0},
	]
	
	var chair_num := 1
	for chair in cafe_chairs:
		spots.append({
			"name": "CafeChair_%02d" % chair_num,
			"position": chair.pos,
			"rotation": chair.rot,
			"building_id": _get_building_id(),
			"building_name": _get_building_name()
		})
		chair_num += 1
	
	return spots
