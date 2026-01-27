extends BaseCinematic
class_name LibraryCinematic

## Library cinematic scene controller
## Extends BaseCinematic with library-specific study spot and NPC configurations


# =============================================================================
# Virtual Method Overrides
# =============================================================================

func _get_scene_name() -> String:
	return "Library"


func _get_building_id() -> String:
	return "library"


func _get_building_name() -> String:
	return "Library"


func _register_with_rnbridge() -> void:
	## Register this scene with RNBridge to receive character updates
	if RNBridge:
		RNBridge.register_library_cinematic(self)
		print("[LibraryCinematic] Registered with RNBridge")


func _get_default_npc_configs() -> Array[Dictionary]:
	## Default NPC configurations - NPCs sitting at study spots
	## Using actual chair positions from the library grid
	## Columns: [1.59, 0.82, -0.76, -1.54], Rows: [1.73, 3.25, 5.49, 7.02, 9.27, 10.79]
	## Even rows face 0°, odd rows face 180°
	## Note: preset_name is left empty to use random NPCSkins
	var configs: Array[Dictionary] = []
	
	# NPC sitting at front-left chair (row 0, col 3)
	configs.append({
		"position": Vector3(-1.54, 0, 1.73),
		"rotation": 0.0,  # Even row faces forward
		"animation": "SITTING_USING_LAPTOP_02"
	})
	
	# NPC sitting at middle-right chair (row 2, col 0)
	configs.append({
		"position": Vector3(1.59, 0, 5.49),
		"rotation": 0.0,  # Even row faces forward
		"animation": "SITTING_USING_LAPTOP_02"
	})
	
	# NPC standing near the reading nook
	configs.append({
		"position": Vector3(1.5, 0, 1.0),
		"rotation": 45.0,
		"animation": "BoredIdle_02"
	})
	
	# NPC sitting at middle chair (row 3, col 1)
	configs.append({
		"position": Vector3(0.82, 0, 7.02),
		"rotation": 180.0,  # Odd row faces backward
		"animation": "SITTING_USING_LAPTOP_02"
	})
	
	return configs


func _get_default_study_spots() -> Array[Dictionary]:
	## Define study spot positions in the library (based on Chair_2 children in Library.gltf)
	## 24 chairs arranged in a 4x6 grid
	## Right side chairs (X > 0) face left (-90°), Left side (X < 0) face right (90°)
	var spots: Array[Dictionary] = []
	
	# 4 columns (X positions)
	var columns := [1.59, 0.82, -0.76, -1.54]
	# 6 rows (Z positions)
	var rows := [1.73, 3.25, 5.49, 7.02, 9.27, 10.79]
	
	var chair_num := 1
	for row_idx in range(rows.size()):
		for col_idx in range(columns.size()):
			var x: float = columns[col_idx]
			var z: float = rows[row_idx]
			# Chairs face each other across tables (alternating by row)
			# Even rows (0, 2, 4) face forward, odd rows (1, 3, 5) face backward
			var rotation: float = 0.0 if row_idx % 2 == 0 else 180.0
			
			spots.append({
				"name": "Chair_%02d" % chair_num,
				"position": Vector3(x, 0, z),
				"rotation": rotation,
				"building_id": _get_building_id(),
				"building_name": _get_building_name()
			})
			chair_num += 1
	
	return spots
