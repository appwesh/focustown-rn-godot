extends Node
class_name DialogAudio

## Handles dialog blip sounds like Animal Crossing

@export var blip_sound: AudioStream
@export var blip_pitch_min: float = 0.9
@export var blip_pitch_max: float = 1.1
@export var blips_per_second: float = 20.0

var _audio_player: AudioStreamPlayer
var _blip_timer: float = 0.0
var _is_playing: bool = false


func _ready() -> void:
	_audio_player = AudioStreamPlayer.new()
	_audio_player.bus = "Master"
	_audio_player.volume_db = -10.0
	add_child(_audio_player)
	
	# Generate a simple blip sound if none provided
	if not blip_sound:
		blip_sound = _generate_blip_sound()
	
	_audio_player.stream = blip_sound


func _process(delta: float) -> void:
	if _is_playing:
		_blip_timer -= delta
		if _blip_timer <= 0:
			_play_blip()
			_blip_timer = 1.0 / blips_per_second


func start_blips() -> void:
	_is_playing = true
	_blip_timer = 0


func stop_blips() -> void:
	_is_playing = false


func _play_blip() -> void:
	if _audio_player and blip_sound:
		_audio_player.pitch_scale = randf_range(blip_pitch_min, blip_pitch_max)
		_audio_player.play()


func _generate_blip_sound() -> AudioStream:
	# Generate a simple sine wave blip
	var sample_rate: int = 22050
	var duration: float = 0.05
	var frequency: float = 440.0
	
	var audio := AudioStreamWAV.new()
	audio.mix_rate = sample_rate
	audio.format = AudioStreamWAV.FORMAT_8_BITS
	audio.stereo = false
	
	var num_samples: int = int(sample_rate * duration)
	var data := PackedByteArray()
	data.resize(num_samples)
	
	for i in range(num_samples):
		var t: float = float(i) / sample_rate
		var envelope: float = 1.0 - (float(i) / num_samples)  # Fade out
		var sample: float = sin(t * frequency * TAU) * envelope
		data[i] = int((sample * 0.5 + 0.5) * 255)
	
	audio.data = data
	return audio

