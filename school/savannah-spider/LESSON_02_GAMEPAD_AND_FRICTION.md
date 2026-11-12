# Lesson 02 · Controller directions are not L3

**Status:** STORY-DERIVED EDUCATIONAL PROPOSAL · Related episodes: **Only One Mask**, **Gigabyte**.

### Starting observation

The avatar runs when Savannah moves the analog stick but continues sliding when the stick returns to center. A controller can send input `0` while the character still has nonzero velocity. The lesson is that **input**, **acceleration** and **velocity** are different state.

```js
// Educational pseudocode, not installed game source.
const desired = inputX * maxSpeed;
const difference = desired - velocityX;
const maxChange = acceleration * dt;
velocityX += Math.max(-maxChange, Math.min(maxChange, difference));
positionX += velocityX * dt;
```

Students should compare rapid deceleration (snaps unrealistically), slow deceleration (sliding), and tuned deceleration (physically legible but responsive). The exercise is about *designed movement feel*, not asserting exact real-world biomechanics.

### Left-stick axis versus L3

Moving a left analog stick means reading horizontal/vertical axes. **Clicking L3** means pressing a separate switch under that stick. In the episode, Savannah uses a fictional sensor/haptic wrist prototype to link these two input channels. Ordinary consumer hardware cannot produce supernatural transformation, and the fictional Gig-Shock must never be presented as a replicable electrical experiment.

### Students prove learning by

1. Demonstrating that releasing input does not automatically reset velocity.
2. Distinguishing an axis event from an L3 pressed/released event.
3. Logging intentional events without recording private controller identifiers or personal information.
4. Comparing a real posture photo (permission obtained) with the animated character's hip/torso delay.
5. Writing a short 'what I changed and how I tested it' note.
