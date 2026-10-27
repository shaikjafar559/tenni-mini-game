//  Tennis Rally - MakeCode Arcade
//  Bounce the ball off the right wall and don't let it pass your racket!
//  --- Scene Setup ---
scene.setBackgroundColor(9)
//  dark blue background
//  Draw a simple court: right wall line and center line
scene.backgroundImage().drawLine(158, 0, 158, 119, 1)
//  right wall (white)
scene.backgroundImage().drawLine(80, 0, 80, 119, 7)
//  center dashed line (yellow)
//  --- Sprites ---
//  Player racket (left side)
let racket = sprites.create(img`
        1 1
        1 1
        1 1
        1 1
        1 1
        1 1
        1 1
        1 1
        `, SpriteKind.Player)
racket.x = 8
racket.y = 60
racket.setFlag(SpriteFlag.StayInScreen, true)
//  Regular ball
let ball = sprites.create(img`
        . f .
        f f f
        . f .
        `, SpriteKind.Projectile)
ball.x = 80
ball.y = 60
ball.vx = 60
ball.vy = 45
//  Do NOT use setBounceOnWall — it bounces all 4 walls including left, blocking miss detection.
//  Bouncing is handled manually in the update loop below.
//  Special bonus ball (appears every 5 points, gold colored)
let specialBall : Sprite = null
let specialActive = false
//  --- Speed progression ---
//  Track when the current rally (chance) started so we can ramp speed over time
let rallyStartTime = game.runtime()
let SPEED_RAMP_INTERVAL = 5000
//  every 5 seconds add a little speed
let SPEED_RAMP_AMOUNT = 8
//  pixels/sec added each interval
//  --- Player Control ---
//  Move racket up and down with D-pad (no left/right)
controller.moveSprite(racket, 0, 80)
//  --- Score & State ---
info.setScore(0)
//  Manage lives manually so we can draw the count at top-centre instead of top-left
let lives = 3
//  Helper: redraws the lives text at the top-centre of the screen
function drawLives() {
    let bg = scene.backgroundImage()
    //  Erase the previous text area (top-centre strip)
    bg.fillRect(55, 1, 50, 7, 9)
    //  Draw new lives count centred around x=80
    bg.print("Chances: " + ("" + lives), 56, 1, 1)
}

drawLives()
//  --- Overlap: racket hits regular ball ---
sprites.onOverlap(SpriteKind.Player, SpriteKind.Projectile, function on_on_overlap(s1: Sprite, s2: Sprite) {
    
    if (s2 == ball) {
        //  Bounce ball back to the right
        ball.vx = Math.abs(ball.vx) + 5
        //  speed up slightly each hit
        //  Slight random vertical angle
        ball.vy = Math.random() * 80 - 40
        info.changeScoreBy(1)
        music.playTone(440, music.beat(BeatFraction.Eighth))
        //  Spawn special ball every 5 points
        if (info.score() % 5 == 0 && !specialActive) {
            spawnSpecialBall()
        }
        
    }
    
})
//  --- Overlap: racket hits special ball ---
sprites.onOverlap(SpriteKind.Player, SpriteKind.Food, function on_on_overlap2(s12: Sprite, s22: Sprite) {
    
    if (s22 == specialBall && specialActive) {
        info.changeScoreBy(3)
        //  bonus 3 points!
        music.playTone(880, music.beat(BeatFraction.Quarter))
        effects.confetti.startScreenEffect(500)
        specialBall.destroy()
        specialActive = false
    }
    
})
//  --- Spawn Special Bonus Ball ---
function spawnSpecialBall() {
    
    specialBall = sprites.create(img`
            . 5 .
            5 4 5
            . 5 .
            `, SpriteKind.Food)
    specialBall.x = 120
    specialBall.y = Math.randomRange(10, 110)
    specialBall.vx = -Math.randomRange(50, 80)
    specialBall.vy = Math.randomRange(-40, 40)
    specialBall.setBounceOnWall(true)
    specialBall.setFlag(SpriteFlag.StayInScreen, true)
    specialActive = true
    //  Special ball disappears after 8 seconds if not caught
    //  (setTimeout is not available in MakeCode; use a countdown via game.onUpdateInterval)
    let specialExpiry = game.runtime() + 8000
    game.onUpdateInterval(200, function on_update_interval() {
        
        if (specialActive && game.runtime() > specialExpiry) {
            specialBall.destroy()
            specialActive = false
        }
        
    })
}

//  --- Game Loop: manual wall bouncing + miss detection ---
game.onUpdate(function on_on_update() {
    
    //  Bounce off top wall
    if (ball.y <= 2) {
        ball.y = 2
        ball.vy = Math.abs(ball.vy)
    }
    
    //  Bounce off bottom wall
    if (ball.y >= 117) {
        ball.y = 117
        ball.vy = -Math.abs(ball.vy)
    }
    
    //  Bounce off right wall
    if (ball.x >= 156) {
        ball.x = 156
        ball.vx = -Math.abs(ball.vx)
    }
    
    //  Ball escaped past the left edge — player missed it
    if (ball.x < 0) {
        lives -= 1
        drawLives()
        music.playTone(200, music.beat(BeatFraction.Quarter))
        //  game over, player lost
        //  reset speed ramp for new chance
        if (lives <= 0) {
            game.over(false)
        } else {
            //  Reset ball to centre for next rally and reset the ramp timer
            ball.x = 80
            ball.y = Math.randomRange(20, 100)
            ball.vx = 60
            ball.vy = Math.randomRange(-45, 45)
            rallyStartTime = game.runtime()
        }
        
    }
    
    //  Speed ramp: every SPEED_RAMP_INTERVAL ms on the same chance, nudge ball faster
    let elapsed = game.runtime() - rallyStartTime
    let rampSteps = Math.floor(elapsed / SPEED_RAMP_INTERVAL)
    let rampBonus = rampSteps * SPEED_RAMP_AMOUNT
    let targetMinSpeed = 60 + rampBonus
    //  Gradually push vx toward the ramped target (only when ball is heading right)
    if (ball.vx > 0 && ball.vx < targetMinSpeed) {
        ball.vx = targetMinSpeed
    } else if (ball.vx < 0 && -ball.vx < targetMinSpeed) {
        ball.vx = -targetMinSpeed
    }
    
    //  Keep ball speed from getting too slow vertically
    if (Math.abs(ball.vy) < 10) {
        ball.vy = ball.vy < 0 ? -15 : 15
    }
    
    //  Cap maximum ball speed so it stays playable
    if (ball.vx > 160) {
        ball.vx = 160
    }
    
    if (ball.vx < -160) {
        ball.vx = -160
    }
    
})
//  --- Title Splash ---
game.splash("Tennis Rally!", "Hit the ball, score points!")
