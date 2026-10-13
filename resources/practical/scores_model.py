"""Teacher model: write only a new named file; do not overwrite an existing result."""
from pathlib import Path

def read_score():
    while True:
        try:
            score = int(input("Score (0 to 20): "))
        except ValueError:
            print("Enter a whole number.")
            continue
        if 0 <= score <= 20:
            return score
        print("Out of range.")

def statistics(scores):
    if not scores:
        raise ValueError("At least one score is required")
    total = 0
    highest = scores[0]
    for score in scores:
        total += score
        if score > highest:
            highest = score
    return total, total / len(scores), highest

def linear_search(values, target):
    for index, value in enumerate(values):
        if value == target:
            return index
    return -1

def bubble_sort(values):
    result = list(values)
    swapped = True
    while swapped:
        swapped = False
        for index in range(len(result) - 1):
            if result[index] > result[index + 1]:
                result[index], result[index + 1] = result[index + 1], result[index]
                swapped = True
    return result

def main():
    scores = [read_score() for _ in range(5)]
    total, mean, highest = statistics(scores)
    summary = f"Total: {total}\nMean: {mean:.2f}\nHighest: {highest}\n"
    print(summary)
    destination = Path(input("New output filename: "))
    try:
        with destination.open("x", encoding="utf-8") as output:
            output.write(summary)
    except FileExistsError:
        print("That file already exists. Choose a new filename on your next run.")
        return
    print("Reopened file:")
    print(destination.read_text(encoding="utf-8"))

if __name__ == "__main__":
    main()
