extends BaseCinematic
class_name CoastalCinematic

## Coastal Cafe cinematic scene controller
## Extends BaseCinematic with coastal-specific identity
## Study spots and NPCs are defined via CinematicStudySpot nodes in the scene


func _get_scene_name() -> String:
	return "Coastal"


func _get_building_id() -> String:
	return "coastal"


func _get_building_name() -> String:
	return "Coastal Cafe"


func _register_with_rnbridge() -> void:
	if RNBridge:
		RNBridge.register_coastal_cinematic(self)
		print("[CoastalCinematic] Registered with RNBridge")
