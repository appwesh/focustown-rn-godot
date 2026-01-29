extends BaseCinematic
class_name LibraryCinematic

## Library cinematic scene controller
## Extends BaseCinematic with library-specific identity
## Study spots and NPCs are defined via CinematicStudySpot nodes in the scene


func _get_scene_name() -> String:
	return "Library"


func _get_building_id() -> String:
	return "library"


func _get_building_name() -> String:
	return "Library"


func _register_with_rnbridge() -> void:
	if RNBridge:
		RNBridge.register_library_cinematic(self)
		print("[LibraryCinematic] Registered with RNBridge")
