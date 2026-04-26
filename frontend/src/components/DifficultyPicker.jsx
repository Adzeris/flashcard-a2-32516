// 1-5 chips for picking flashcard difficulty. Used in forms and in the
// study panel filter. Keeping it as its own component so the chip styling
// only lives in one place.

const LEVELS = [1, 2, 3, 4, 5];

function DifficultyPicker({ value, onChange, disabled = false, name = "difficulty" }) {
  return (
    <div className={`difficulty-picker ${disabled ? "is-disabled" : ""}`}>
      {LEVELS.map((level) => (
        <button
          key={`${name}-${level}`}
          type="button"
          className={`difficulty-chip ${Number(value) === level ? "active" : ""}`}
          onClick={() => onChange(level)}
          disabled={disabled}
        >
          {level}
        </button>
      ))}
    </div>
  );
}

export default DifficultyPicker;
