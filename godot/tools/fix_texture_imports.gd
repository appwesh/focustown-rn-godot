@tool
extends EditorScript

## Batch update texture import settings for mobile optimization
## Run this from: Project -> Tools -> Run EditorScript
## After running, reimport all: Project -> Reload Current Project

const TARGET_DIRS = [
	"res://assets/characters/",
	"res://assets/environments/",
]

var updated_count := 0
var skipped_count := 0

func _run():
	print("=== Texture Import Optimizer ===")
	print("Scanning for texture .import files...")
	
	for dir_path in TARGET_DIRS:
		_process_directory(dir_path)
	
	print("")
	print("=== DONE ===")
	print("Updated: ", updated_count, " files")
	print("Skipped: ", skipped_count, " files (already optimized or normal maps)")
	print("")
	print("IMPORTANT: Now reload the project to reimport textures:")
	print("  Project -> Reload Current Project")


func _process_directory(path: String):
	var dir = DirAccess.open(path)
	if dir == null:
		print("Could not open directory: ", path)
		return
	
	dir.list_dir_begin()
	var file_name = dir.get_next()
	
	while file_name != "":
		if file_name == "." or file_name == "..":
			file_name = dir.get_next()
			continue
		
		var full_path = path.path_join(file_name)
		
		if dir.current_is_dir():
			_process_directory(full_path)
		elif file_name.ends_with(".import"):
			_process_import_file(full_path)
		
		file_name = dir.get_next()
	
	dir.list_dir_end()


func _process_import_file(import_path: String):
	# Only process texture imports
	if not _is_texture_import(import_path):
		return
	
	var config = ConfigFile.new()
	var err = config.load(import_path)
	if err != OK:
		print("Failed to load: ", import_path)
		return
	
	# Check if it's a normal map (keep those as-is or use specific settings)
	var source_file = config.get_value("deps", "source_file", "")
	var is_normal_map = "_N." in source_file or "_Normal." in source_file or "_normal." in source_file
	
	# Get current mode
	var current_mode = config.get_value("params", "compress/mode", 0)
	
	# Skip if already VRAM compressed
	if current_mode == 2:
		skipped_count += 1
		return
	
	# Set optimal settings for SMALL FILE SIZE
	# Mode 1 = Lossy (WebP) - best for download size
	config.set_value("params", "compress/mode", 1)  # Lossy compression
	config.set_value("params", "compress/lossy_quality", 0.7)  # 70% quality (good balance)
	config.set_value("params", "mipmaps/generate", false)  # Disable mipmaps to save space
	
	# Normal maps need special handling
	if is_normal_map:
		config.set_value("params", "compress/normal_map", 1)  # Enable normal map mode
	
	# Save the updated import file
	err = config.save(import_path)
	if err == OK:
		updated_count += 1
		if updated_count <= 10 or updated_count % 100 == 0:
			print("Updated: ", import_path)
	else:
		print("Failed to save: ", import_path)


func _is_texture_import(path: String) -> bool:
	# Check if this is a texture import file
	var extensions = [".tga.import", ".png.import", ".jpg.import", ".jpeg.import"]
	for ext in extensions:
		if path.ends_with(ext):
			return true
	return false
