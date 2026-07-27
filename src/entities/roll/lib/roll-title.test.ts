import { ManualRollTitleMaxLength, manualRollTitle } from './roll-title';

const JULY_27 = new Date(2026, 6, 27, 14, 0).getTime();

describe('manualRollTitle', () => {
  it.each([undefined, '', '   ', '\n\t'])(
    'names a roll after the day it was made for %j',
    (title) => {
      // 묶음 07-27
      expect(manualRollTitle(title, JULY_27)).toBe('\uBB36\uC74C 07-27');
    },
  );

  it('keeps the name the user gave, trimmed', () => {
    const title = '\uB178\uC744 \uBAA8\uC74C'; // 노을 모음

    expect(manualRollTitle(`  ${title}  `, JULY_27)).toBe(title);
  });

  it('cuts a name past the cap instead of refusing it', () => {
    expect(manualRollTitle('a'.repeat(ManualRollTitleMaxLength + 8), JULY_27)).toBe(
      'a'.repeat(ManualRollTitleMaxLength),
    );
  });

  it('leaves a name exactly at the cap alone', () => {
    const exact = 'b'.repeat(ManualRollTitleMaxLength);

    expect(manualRollTitle(exact, JULY_27)).toBe(exact);
  });

  it('allows duplicates, so two rolls may carry the same name', () => {
    const title = '\uC5EC\uD589'; // 여행

    expect(manualRollTitle(title, JULY_27)).toBe(manualRollTitle(title, JULY_27 + 60_000));
  });
});
