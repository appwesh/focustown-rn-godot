extends Marker3D
class_name CinematicStudySpot
## A marker for study spots in cinematic scenes
## Place these as children of a BaseCinematic - they will be auto-detected
## The Marker3D position defines where the player sits
## Can optionally spawn an NPC at this spot

## Display name for this spot (used for logging/debugging)
@export var spot_name: String = "StudySpot"

## Y rotation in degrees when player is seated
@export var sit_rotation: float = 0.0

## Override building ID (defaults to scene's building_id if empty)
@export var building_id_override: String = ""

## Override building name (defaults to scene's building_name if empty)
@export var building_name_override: String = ""

@export_group("NPC")
## Spawn an NPC at this study spot
@export var spawn_npc: bool = false

## NPC preset name (leave empty for random NPCSkins)
@export var npc_preset: String = ""

## Animation for the NPC (defaults to sitting with laptop if empty)
@export var npc_animation: String = "SITTING_USING_LAPTOP_02"


func _ready() -> void:
	# Add to group for easy detection
	add_to_group("cinematic_study_spots")


## Get study spot data as dictionary (compatible with BaseCinematic)
func get_spot_data(default_building_id: String = "", default_building_name: String = "") -> Dictionary:
	return {
		"name": spot_name if not spot_name.is_empty() else name,
		"position": global_position,
		"rotation": sit_rotation,
		"building_id": building_id_override if not building_id_override.is_empty() else default_building_id,
		"building_name": building_name_override if not building_name_override.is_empty() else default_building_name,
		"node": self,
		"has_npc": spawn_npc  # True if this spot is occupied by an NPC
	}


## Check if this spot is available (not occupied by NPC)
func is_available() -> bool:
	return not spawn_npc


## Get NPC config if this spot should spawn an NPC
func get_npc_config() -> Dictionary:
	if not spawn_npc:
		return {}
	
	return {
		"preset_name": npc_preset,
		"position": global_position,
		"rotation": sit_rotation,
		"animation": npc_animation if not npc_animation.is_empty() else "SITTING_USING_LAPTOP_02"
	}
