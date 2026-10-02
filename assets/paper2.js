'use strict';

const termSearch = document.getElementById('term-search');
if (termSearch) {
  const terms = [...document.querySelectorAll('.term')];
  termSearch.addEventListener('input', () => {
    const query = termSearch.value.trim().toLowerCase();
    let count = 0;
    for (const term of terms) {
      term.hidden = !term.textContent.toLowerCase().includes(query);
      if (!term.hidden) count++;
    }
    document.getElementById('term-count').textContent = `${count} of ${terms.length} terms`;
  });
  document.getElementById('expand-terms').addEventListener('click', () => {
    terms.filter(term => !term.hidden).forEach(term => { term.open = true; });
  });
  document.getElementById('collapse-terms').addEventListener('click', () => {
    terms.forEach(term => { term.open = false; });
  });
}

const quiz = document.getElementById('quiz');
if (quiz) {
  const score = document.getElementById('quiz-score');
  const questions = [...quiz.querySelectorAll('fieldset')];
  const clearFeedback = () => {
    score.textContent = '';
    for (const question of questions) {
      const feedback = question.querySelector('.feedback');
      feedback.hidden = true;
      feedback.textContent = '';
    }
  };
  quiz.addEventListener('submit', event => {
    event.preventDefault();
    let correct = 0;
    let unanswered = 0;
    for (const question of questions) {
      const answer = question.querySelector('input:checked');
      const feedback = question.querySelector('.feedback');
      feedback.hidden = false;
      if (!answer) {
        unanswered++;
        feedback.className = 'feedback bad';
        feedback.textContent = 'Choose an answer for this question.';
        continue;
      }
      const isCorrect = answer.value === question.dataset.answer;
      if (isCorrect) correct++;
      feedback.className = `feedback ${isCorrect ? 'good' : 'bad'}`;
      feedback.textContent = `${isCorrect ? 'Correct.' : 'Try again.'} ${feedback.dataset.explanation}`;
    }
    score.textContent = `${correct} / ${questions.length} correct.${unanswered ? ` ${unanswered} unanswered.` : ' Review the explanations below each question.'}`;
  });
  quiz.addEventListener('reset', clearFeedback);
  quiz.addEventListener('change', clearFeedback);
}

const logic = document.getElementById('logic-inputs');
if (logic) {
  const inputs = ['a', 'b', 'c'].map(id => document.getElementById(`input-${id}`));
  const rows = [];
  for (let a = 0; a <= 1; a++) {
    for (let b = 0; b <= 1; b++) {
      for (let c = 0; c <= 1; c++) rows.push([a, b, c, Number(Boolean(a || b)), 1 - c, Number(Boolean((a || b) && !c))]);
    }
  }
  const table = document.createElement('table');
  const caption = table.createCaption();
  caption.textContent = 'X = (A OR B) AND NOT C · all eight input combinations';
  const head = table.createTHead().insertRow();
  ['A', 'B', 'C', 'A OR B', 'NOT C', 'X'].forEach(label => {
    const th = document.createElement('th'); th.scope = 'col'; th.textContent = label; head.append(th);
  });
  const body = table.createTBody();
  rows.forEach(values => {
    const row = body.insertRow();
    values.forEach(value => { row.insertCell().textContent = value; });
  });
  const wrapper = document.getElementById('logic-table');
  wrapper.className = 'table-wrap'; wrapper.append(table);
  const update = () => {
    const [a, b, c] = inputs.map(input => Number(input.checked));
    const active = a * 4 + b * 2 + c;
    [...body.rows].forEach((row, index) => {
      row.classList.toggle('active-row', index === active);
      if (index === active) row.setAttribute('aria-current', 'true');
      else row.removeAttribute('aria-current');
    });
    document.getElementById('logic-result').textContent = `A OR B = ${rows[active][3]}; NOT C = ${rows[active][4]}; X = ${rows[active][5]} · Alarm ${rows[active][5] ? 'on' : 'off'}`;
  };
  logic.addEventListener('change', update);
  update();
}

const traceNext = document.getElementById('trace-next');
if (traceNext) {
  const messages = [
    'Initial state: Total = 0. No values have been added.',
    'Index = 1: add 4. Total = 0 + 4 = 4.',
    'Index = 2: add 7. Total = 4 + 7 = 11.',
    'Index = 3: add 2. Total = 11 + 2 = 13.',
    'The loop is complete. OUTPUT displays 13.'
  ];
  let step = 0;
  const status = document.getElementById('trace-status');
  traceNext.addEventListener('click', () => {
    step = Math.min(step + 1, messages.length - 1);
    status.textContent = messages[step];
    traceNext.disabled = step === messages.length - 1;
  });
  document.getElementById('trace-reset').addEventListener('click', () => {
    step = 0;
    status.textContent = messages[0];
    traceNext.disabled = false;
  });
}
