extends BaseCinematic
class_name IndoorCafeCinematic

## Indoor Cafe cinematic scene controller
## Extends BaseCinematic with indoor cafe-specific identity
## Study spots and NPCs are defined via CinematicStudySpot nodes in the scene


func _get_scene_name() -> String:
	return "IndoorCafe"


func _get_building_id() -> String:
	return "indoor_cafe"


func _get_building_name() -> String:
	return "Indoor Café"


func _register_with_rnbridge() -> void:
	if RNBridge:
		RNBridge.register_indoor_cafe_cinematic(self)
		print("[IndoorCafeCinematic] Registered with RNBridge")
