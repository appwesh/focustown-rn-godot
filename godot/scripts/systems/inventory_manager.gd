extends Node

signal item_added(item_id: String)
signal item_removed(item_id: String)
signal inventory_changed

var _items: Dictionary = {}  # item_id -> quantity


func add_item(item_id: String, quantity: int = 1) -> void:
	if _items.has(item_id):
		_items[item_id] += quantity
	else:
		_items[item_id] = quantity
	
	item_added.emit(item_id)
	inventory_changed.emit()


func remove_item(item_id: String, quantity: int = 1) -> bool:
	if not has_item(item_id, quantity):
		return false
	
	_items[item_id] -= quantity
	if _items[item_id] <= 0:
		_items.erase(item_id)
	
	item_removed.emit(item_id)
	inventory_changed.emit()
	return true


func has_item(item_id: String, quantity: int = 1) -> bool:
	return _items.get(item_id, 0) >= quantity


func get_item_count(item_id: String) -> int:
	return _items.get(item_id, 0)


func get_all_items() -> Dictionary:
	return _items.duplicate()

