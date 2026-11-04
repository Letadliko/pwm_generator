cmake_minimum_required(VERSION 3.13)

# Pico SDK: buď proměnná prostředí PICO_SDK_PATH, nebo -DPICO_SDK_PATH=...
include(pico_sdk_import.cmake)

project(pwm_generator C CXX ASM)
set(CMAKE_C_STANDARD 11)
set(CMAKE_CXX_STANDARD 17)

pico_sdk_init()

add_executable(pwm_generator
    pwm_generator.c
    ssd1306.c
    font8x16.c
)

target_include_directories(pwm_generator PRIVATE ${CMAKE_CURRENT_LIST_DIR})

# Parametry displeje, lze změnit při konfiguraci: cmake .. -DDISPLAY_POWERUP_DELAY_MS=300
set(DISPLAY_POWERUP_DELAY_MS 200 CACHE STRING "Pauza po zapnutí před inicializací displeje [ms]")
set(DISPLAY_INIT_RETRIES 5 CACHE STRING "Počet pokusů o inicializaci displeje")
target_compile_definitions(pwm_generator PRIVATE
    DISPLAY_POWERUP_DELAY_MS=${DISPLAY_POWERUP_DELAY_MS}
    DISPLAY_INIT_RETRIES=${DISPLAY_INIT_RETRIES}
)

target_link_libraries(pwm_generator
    pico_stdlib
    hardware_i2c
    hardware_pwm
    hardware_clocks
)

pico_enable_stdio_usb(pwm_generator 1)
pico_enable_stdio_uart(pwm_generator 0)

pico_add_extra_outputs(pwm_generator)
