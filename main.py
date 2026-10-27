# Tennis Rally - MakeCode Arcade
# Bounce the ball off the right wall and don't let it pass your racket!
# --- Scene Setup ---
scene.set_background_color(9)
# dark blue background
# Draw a simple court: right wall line and center line
scene.background_image().draw_line(158, 0, 158, 119, 1)
# right wall (white)
scene.background_image().draw_line(80, 0, 80, 119, 7)
# center dashed line (yellow)
# --- Sprites ---
# Player racket (left side)
racket = sprites.create(img("""
        1 1
        1 1
        1 1
        1 1
        1 1
        1 1
        1 1
        1 1
        """),
    SpriteKind.player)
racket.x = 8
racket.y = 60
racket.set_flag(SpriteFlag.STAY_IN_SCREEN, True)
# Regular ball
ball = sprites.create(img("""
        . f .
        f f f
        . f .
        """),
    SpriteKind.projectile)
ball.x = 80
ball.y = 60
ball.vx = 60
ball.vy = 45
# Do NOT use setBounceOnWall — it bounces all 4 walls including left, blocking miss detection.
# Bouncing is handled manually in the update loop below.
# Special bonus ball (appears every 5 points, gold colored)
specialBall: Sprite = None
specialActive = False
# --- Speed progression ---
# Track when the current rally (chance) started so we can ramp speed over time
rallyStartTime = game.runtime()
SPEED_RAMP_INTERVAL = 5000
# every 5 seconds add a little speed
SPEED_RAMP_AMOUNT = 8
# pixels/sec added each interval
# --- Player Control ---
# Move racket up and down with D-pad (no left/right)
controller.move_sprite(racket, 0, 80)
# --- Score & State ---
info.set_score(0)
# Manage lives manually so we can draw the count at top-centre instead of top-left
lives = 3
# Helper: redraws the lives text at the top-centre of the screen
def drawLives():
    bg = scene.background_image()
    # Erase the previous text area (top-centre strip)
    bg.fill_rect(55, 1, 50, 7, 9)
    # Draw new lives count centred around x=80
    bg.print("Chances: " + str(lives), 56, 1, 1)
drawLives()
# --- Overlap: racket hits regular ball ---

def on_on_overlap(s1, s2):
    global specialActive
    if s2 == ball:
        # Bounce ball back to the right
        ball.vx = abs(ball.vx) + 5
        # speed up slightly each hit
        # Slight random vertical angle
        ball.vy = (Math.random() * 80 - 40)
        info.change_score_by(1)
        music.play_tone(440, music.beat(BeatFraction.EIGHTH))
        # Spawn special ball every 5 points
        if info.score() % 5 == 0 and not specialActive:
            spawnSpecialBall()
sprites.on_overlap(SpriteKind.player, SpriteKind.projectile, on_on_overlap)

# --- Overlap: racket hits special ball ---

def on_on_overlap2(s12, s22):
    global specialActive
    if s22 == specialBall and specialActive:
        info.change_score_by(3)
        # bonus 3 points!
        music.play_tone(880, music.beat(BeatFraction.QUARTER))
        effects.confetti.start_screen_effect(500)
        specialBall.destroy()
        specialActive = False
sprites.on_overlap(SpriteKind.player, SpriteKind.food, on_on_overlap2)

# --- Spawn Special Bonus Ball ---
def spawnSpecialBall():
    global specialBall, specialActive
    specialBall = sprites.create(img("""
            . 5 .
            5 4 5
            . 5 .
            """),
        SpriteKind.food)
    specialBall.x = 120
    specialBall.y = Math.random_range(10, 110)
    specialBall.vx = -(Math.random_range(50, 80))
    specialBall.vy = Math.random_range(-40, 40)
    specialBall.set_bounce_on_wall(True)
    specialBall.set_flag(SpriteFlag.STAY_IN_SCREEN, True)
    specialActive = True
    # Special ball disappears after 8 seconds if not caught
    # (setTimeout is not available in MakeCode; use a countdown via game.onUpdateInterval)
    specialExpiry = game.runtime() + 8000
    
    def on_update_interval():
        global specialActive
        if specialActive and game.runtime() > specialExpiry:
            specialBall.destroy()
            specialActive = False
    game.on_update_interval(200, on_update_interval)
    
# --- Game Loop: manual wall bouncing + miss detection ---

def on_on_update():
    global lives, rallyStartTime
    # Bounce off top wall
    if ball.y <= 2:
        ball.y = 2
        ball.vy = abs(ball.vy)
    # Bounce off bottom wall
    if ball.y >= 117:
        ball.y = 117
        ball.vy = -abs(ball.vy)
    # Bounce off right wall
    if ball.x >= 156:
        ball.x = 156
        ball.vx = -abs(ball.vx)
    # Ball escaped past the left edge — player missed it
    if ball.x < 0:
        lives -= 1
        drawLives()
        music.play_tone(200, music.beat(BeatFraction.QUARTER))
        # game over, player lost
        # reset speed ramp for new chance
        if lives <= 0:
            game.over(False)
        else:
            # Reset ball to centre for next rally and reset the ramp timer
            ball.x = 80
            ball.y = Math.random_range(20, 100)
            ball.vx = 60
            ball.vy = Math.random_range(-45, 45)
            rallyStartTime = game.runtime()
    # Speed ramp: every SPEED_RAMP_INTERVAL ms on the same chance, nudge ball faster
    elapsed = game.runtime() - rallyStartTime
    rampSteps = Math.floor(elapsed / SPEED_RAMP_INTERVAL)
    rampBonus = rampSteps * SPEED_RAMP_AMOUNT
    targetMinSpeed = 60 + rampBonus
    # Gradually push vx toward the ramped target (only when ball is heading right)
    if ball.vx > 0 and ball.vx < targetMinSpeed:
        ball.vx = targetMinSpeed
    elif ball.vx < 0 and -ball.vx < targetMinSpeed:
        ball.vx = -targetMinSpeed
    # Keep ball speed from getting too slow vertically
    if abs(ball.vy) < 10:
        ball.vy = -15 if ball.vy < 0 else 15
    # Cap maximum ball speed so it stays playable
    if ball.vx > 160:
        ball.vx = 160
    if ball.vx < -160:
        ball.vx = -160
game.on_update(on_on_update)

# --- Title Splash ---
game.splash("Tennis Rally!", "Hit the ball, score points!")