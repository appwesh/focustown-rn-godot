extends Node
class_name NPCSpawnRandomizer
## Randomizes which CinematicStudySpot nodes spawn NPCs
## Attach as a child of a BaseCinematic scene - runs before NPC spawning
##
## This script finds all CinematicStudySpot children and randomly assigns
## spawn_npc = true to a subset of them based on configuration.

## Minimum number of NPCs to spawn
@export var min_npcs: int = 4

## Maximum number of NPCs to spawn
@export var max_npcs: int = 10

## Reserved spots that should NEVER have NPCs (e.g., spots near entrance)
## Use spot names like "Chair_01", "Chair_02"
@export var reserved_spot_names: Array[String] = []

## Preferred spots that should be prioritized for NPCs (filled first)
## Use spot names - these will be selected before random selection
@export var preferred_spot_names: Array[String] = []

## If true, randomize on every scene load. If false, use a seed for consistency
@export var randomize_each_load: bool = true

## Seed for consistent randomization (only used if randomize_each_load is false)
@export var random_seed: int = 0


func _ready() -> void:
	# Run immediately before parent's _ready processes NPCs
	# Use call_deferred to ensure all children are loaded but before parent processes
	_randomize_npc_spawns()


func _randomize_npc_spawns() -> void:
	var spots := _find_all_study_spots()
	if spots.is_empty():
		push_warning("[NPCSpawnRandomizer] No CinematicStudySpot nodes found")
		return

	# Setup random number generator
	var rng := RandomNumberGenerator.new()
	if randomize_each_load:
		rng.randomize()
	else:
		rng.seed = random_seed

	# Filter out reserved spots
	var available_spots: Array[CinematicStudySpot] = []
	var preferred_spots: Array[CinematicStudySpot] = []

	for spot in spots:
		var spot_name: String = spot.spot_name if not spot.spot_name.is_empty() else spot.name

		# Skip reserved spots
		if spot_name in reserved_spot_names:
			spot.spawn_npc = false
			continue

		# Separate preferred from regular spots
		if spot_name in preferred_spot_names:
			preferred_spots.append(spot)
		else:
			available_spots.append(spot)

	# Reset all available spots to not spawn NPCs
	for spot in available_spots:
		spot.spawn_npc = false
	for spot in preferred_spots:
		spot.spawn_npc = false

	# Determine how many NPCs to spawn
	var total_available := preferred_spots.size() + available_spots.size()
	var clamped_max := mini(max_npcs, total_available)
	var clamped_min := mini(min_npcs, clamped_max)
	var npc_count := rng.randi_range(clamped_min, clamped_max)

	print("[NPCSpawnRandomizer] Spawning %d NPCs (range: %d-%d, available: %d)" % [
		npc_count, clamped_min, clamped_max, total_available
	])

	# First, assign preferred spots
	var assigned := 0
	for spot in preferred_spots:
		if assigned >= npc_count:
			break
		spot.spawn_npc = true
		assigned += 1
		print("[NPCSpawnRandomizer] Assigned preferred spot: %s" % _get_spot_name(spot))

	# Then, randomly assign remaining from available spots
	if assigned < npc_count and available_spots.size() > 0:
		# Shuffle available spots
		_shuffle_spots(available_spots, rng)

		for spot in available_spots:
			if assigned >= npc_count:
				break
			spot.spawn_npc = true
			assigned += 1
			print("[NPCSpawnRandomizer] Assigned random spot: %s" % _get_spot_name(spot))

	print("[NPCSpawnRandomizer] Total NPCs assigned: %d" % assigned)


func _find_all_study_spots() -> Array[CinematicStudySpot]:
	var spots: Array[CinematicStudySpot] = []
	var parent: Node = get_parent()
	if parent:
		_find_study_spots_recursive(parent, spots)
	return spots


func _find_study_spots_recursive(node: Node, spots: Array[CinematicStudySpot]) -> void:
	for idx in range(node.get_child_count()):
		var child: Node = node.get_child(idx)
		if child is CinematicStudySpot:
			spots.append(child as CinematicStudySpot)
		# Don't recurse into this node itself
		if child != self:
			_find_study_spots_recursive(child, spots)


func _get_spot_name(spot: CinematicStudySpot) -> String:
	return spot.spot_name if not spot.spot_name.is_empty() else spot.name


func _shuffle_spots(arr: Array[CinematicStudySpot], rng: RandomNumberGenerator) -> void:
	## Fisher-Yates shuffle for study spots
	for i in range(arr.size() - 1, 0, -1):
		var j := rng.randi_range(0, i)
		var temp: CinematicStudySpot = arr[i]
		arr[i] = arr[j]
		arr[j] = temp
