extends Node
## Manages remote players for group study sessions
## Handles spawning, updating state, and removing remote players

## Preloaded remote player scene
var remote_player_scene: PackedScene

## Dictionary of active remote players: od_id -> RemotePlayer node
var remote_players: Dictionary = {}

## Fixed spawn point - matches the player spawn in town.tscn
var entrance_position: Vector3 = Vector3(-6, 0.5, -2)


func _ready() -> void:
	# Load the remote player scene
	remote_player_scene = preload("res://scenes/player/remote_player.tscn")
	print("[MultiplayerManager] Ready")


## Spawn a remote player
## @param od_id Unique user ID
## @param display_name Name to show above player
## @param state 'entrance' or 'seated'
## @param spot_id Spot ID if seated, empty if at entrance
func spawn_remote_player(od_id: String, display_name: String, state: String, spot_id: String) -> void:
	# Don't spawn if already exists
	if remote_players.has(od_id):
		print("[MultiplayerManager] Player already exists, updating instead: ", od_id)
		update_remote_player_state(od_id, state, spot_id)
		return
	
	# Instance the remote player scene
	var remote_player := remote_player_scene.instantiate() as Node3D
	if not remote_player:
		push_error("[MultiplayerManager] Failed to instantiate remote player scene")
		return
	
	# Set up the remote player
	remote_player.name = "RemotePlayer_" + od_id
	remote_player.set_meta("od_id", od_id)
	remote_player.set_meta("display_name", display_name)
	
	# Add to scene tree first (player starts invisible with scale=0)
	var players_container := _get_or_create_players_container()
	players_container.add_child(remote_player)
	
	# Initialize position based on state BEFORE showing
	if state == "seated" and not spot_id.is_empty():
		_teleport_to_seat(remote_player, spot_id)
	else:
		_teleport_to_entrance(remote_player)
	
	# Set display name
	if remote_player.has_method("set_display_name"):
		remote_player.call("set_display_name", display_name)
	
	# NOW play enter animation (after position is set)
	if remote_player.has_method("play_enter"):
		remote_player.call("play_enter")
	
	# Store reference
	remote_players[od_id] = remote_player
	print("[MultiplayerManager] Spawned remote player: ", od_id, " at ", state)


## Update a remote player's state (teleport to entrance or seat)
func update_remote_player_state(od_id: String, state: String, spot_id: String) -> void:
	if not remote_players.has(od_id):
		push_warning("[MultiplayerManager] Player not found: ", od_id)
		return
	
	var remote_player: Node3D = remote_players[od_id]
	
	if state == "seated" and not spot_id.is_empty():
		_teleport_to_seat(remote_player, spot_id)
	# For walking state, position will be updated via update_remote_player_position
	
	print("[MultiplayerManager] Updated player state: ", od_id, " -> ", state)


## Update a remote player's position with interpolation (only if changed)
func update_remote_player_position(od_id: String, target_pos: Vector3) -> void:
	if not remote_players.has(od_id):
		return
	
	var remote_player: Node3D = remote_players[od_id]
	
	# Only update if position is significantly different
	if remote_player.global_position.distance_to(target_pos) < 0.05:
		return
	
	# Store target position for interpolation
	if remote_player.has_method("set_target_position"):
		remote_player.call("set_target_position", target_pos)
	else:
		# Fallback: direct position update
		remote_player.global_position = target_pos


## Remove a remote player
func remove_remote_player(od_id: String) -> void:
	if not remote_players.has(od_id):
		return
	
	var remote_player: Node3D = remote_players[od_id]
	remote_players.erase(od_id)
	
	# Play exit animation if available
	if remote_player.has_method("play_exit"):
		remote_player.call("play_exit")
		# Wait for animation then queue free
		await get_tree().create_timer(0.5).timeout
	
	remote_player.queue_free()
	print("[MultiplayerManager] Removed remote player: ", od_id)


## Clear all remote players
func clear_all() -> void:
	for od_id in remote_players.keys():
		remove_remote_player(od_id)
	remote_players.clear()
	print("[MultiplayerManager] Cleared all remote players")


## Get or create the container node for remote players
func _get_or_create_players_container() -> Node3D:
	var town := get_tree().current_scene
	if not town:
		push_error("[MultiplayerManager] No current scene")
		return null
	
	# Look for existing container
	var container := town.get_node_or_null("RemotePlayers")
	if container:
		return container
	
	# Create new container
	container = Node3D.new()
	container.name = "RemotePlayers"
	town.add_child(container)
	print("[MultiplayerManager] Created RemotePlayers container")
	return container


## Teleport remote player to entrance
func _teleport_to_entrance(player: Node3D) -> void:
	player.global_position = entrance_position
	# Also sync the target position so interpolation doesn't fight the teleport
	if player.has_method("set_target_position"):
		player.call("set_target_position", entrance_position)
	print("[MultiplayerManager] Teleported to entrance: ", player.name)


## Teleport remote player to a specific study spot
## spot_id format: "ParentName_SpotName" (e.g., "Bench1_StudySpot")
func _teleport_to_seat(player: Node3D, spot_id: String) -> void:
	# Find the study spot node by unique ID (parent_spotname)
	var study_spots := get_tree().get_nodes_in_group("study_spots")
	for spot in study_spots:
		var unique_id := _get_unique_spot_id(spot)
		if unique_id == spot_id:
			# Position at the spot with slight offset
			var spot_pos: Vector3 = spot.global_position
			var final_pos := spot_pos + Vector3(0.5, 0, 0) # Offset so they don't overlap
			player.global_position = final_pos
			
			# Also sync the target position so interpolation doesn't fight the teleport
			if player.has_method("set_target_position"):
				player.call("set_target_position", final_pos)
			
			# Look at the center of the spot
			if player.has_method("look_at"):
				player.look_at(spot_pos, Vector3.UP)
			
			print("[MultiplayerManager] Teleported to seat: ", player.name, " -> ", spot_id)
			return
	
	push_warning("[MultiplayerManager] Study spot not found: ", spot_id)
	# Fall back to entrance
	_teleport_to_entrance(player)


## Get a unique spot ID that includes the parent (e.g., "Bench1_StudySpot")
## Must match the format used by RNBridge._get_unique_spot_id()
func _get_unique_spot_id(spot: Node3D) -> String:
	var parent := spot.get_parent()
	if parent and parent.name != "StudySpots" and parent.name != "root":
		return parent.name + "_" + spot.name
	return spot.name

