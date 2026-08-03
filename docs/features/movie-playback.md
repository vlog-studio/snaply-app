# Movie playback

## User goal

Users watch a finished movie, and see what it was made of.

```text
/movies       tile (ready)          →  /movie/[id]/play
/  (스튜디오)  최근 완성 row          →  /movie/[id]/play
/movie/[id]   ③ 생성 · 무비 보기     →  /movie/[id]/play   (replaces the editor)

/movie/[id]/play  (무비)
├── 이름              rename sheet
├── player           cuts in order, tap to pause / replay, one segment per cut
├── 레시피            스타일 · 배경 음악 · 자동 자막 · 비율 · 완성 시각
└── 무비 목록으로
```

A finished movie opens here rather than in the editor: the thing to do with it is watch it, and its cuts and settings are frozen until regeneration exists. An unfinished movie still opens in the [editor](movie-editor.md), which is where the work it is waiting for happens.

## What "playing a movie" means

**There is no rendered video file.** No compositing backend exists, so a finished movie is played by running its cuts back to back, each inside its trim window — the same list the editor assembled. That is deliberate rather than a placeholder: the order and lengths the user chose are exactly what they get back (concept §6), which is the guarantee the whole editor exists for.

| Capability | Status | Actual behavior |
| --- | --- | --- |
| Sequential playback | `Functional` | The cuts play in stored order with no gap between them. Two players alternate: while one plays, the other holds the next cut preloaded and paused on its first frame, so the swap is instant with no black flash. After each swap the freed player preloads the cut after that. |
| Trim-aware playback | `Functional` | A cut starts at its window's start and is advanced when the position reaches its end, rather than waiting for the file to run out. `playToEnd` still catches the untrimmed case. The outgoing player is paused at the boundary — a cut ends with file left over, and an unpaused one would keep playing unseen but audible. |
| Pause, resume, replay | `Functional` | Tapping the stage pauses and resumes; after the last cut the same tap replays from the first. |
| Progress | `Functional` | One segment per cut across the bottom, filled up to the cut playing now, plus a `컷 n / N` counter. A movie's shape is visible while it plays. |
| Recipe | `Functional` | Style, background music, subtitles, ratio, and when the movie finished, as a read-out. |
| Rename | `Functional` | `이름` opens the same sheet the editor uses (`features/rename-movie`). A movie usually earns its name here, once it has been seen. |
| Every original deleted | `Functional` | A cut whose original was deleted is skipped rather than shown as a gap; a movie with nothing left to play says so instead of mounting a player with no source. |
| Rendered file | `Not implemented` | `Movie.render.uri` is where a composited file will go. When one exists, a movie that has it should play as a single video and this player stays for the movies generated before it. |
| Share, regenerate, delete | `Not implemented` | Stage 4. |

Playback is native media, so it is verified on a device rather than in JavaScript tests — the resolution from a movie to its playlist is what the unit test covers (`model/use-movie-playback.test.ts`).

## Ownership

- `src/pages/movie-detail` owns the screen, the sequential player (`ui/cut-player.tsx`), and the movie→playlist resolution (`model/use-movie-playback.ts`).
- `src/features/rename-movie` owns the rename sheet, shared with the editor.
- `src/entities/movie` owns the movie and its `render`; `src/entities/snap` resolves the cut references to files.
- `src/app/movie/[id]/play.tsx` is the route adapter; the screen is registered in `src/_app/routes/root-layout.tsx`.

## Known limitations

- No rendered file, no style applied, no music, no subtitles — the player runs the raw cuts. The screen says so.
- Playback has no scrubber and no seeking within the movie; a cut can only be paused or the whole movie replayed.
- The player is muted by nothing and mixes no audio track: each cut plays its own recorded sound.
- The cuts and settings shown here cannot be changed. Editing a finished movie means regenerating it, which does not exist yet.
