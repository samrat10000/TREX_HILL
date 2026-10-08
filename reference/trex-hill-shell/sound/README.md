# Sound
`hillkit-audio.js` is the sound engine: engines (inline-6, V8, turbo diesel, electric) built from combustion pulses on the real firing order, tyres per surface (asphalt, gravel, dirt, grass, snow, mud), wind, rain, rain-on-roof, campfire, lake, crickets, dawn birds, owl, gulls, thunder by distance, horn, door, bumps, splash, UI ticks.
API: `HillAudio.init()`, `.engine.setType(t)/start()/stop()/set(rpm,throttle)`, `.tires.set(speed,surface,slip)`, `.ambience({wind,rain,storm,fire,water,day,night,roof})`, `.play(name,opts)`, `.thunder(km)`, `new HillAudio.Drive(type).fromSpeed(v,throttle,dt)` for rpm and gears.
The pre-rendered WAV pack (77 files) was delivered separately as `hill-kit-sounds.zip`.
