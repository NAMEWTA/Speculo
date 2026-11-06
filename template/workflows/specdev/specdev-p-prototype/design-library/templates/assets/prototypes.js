/* Original Speculo fixtures. No network, production actions, or persistent storage. */
(() => {
  const one = (selector) => document.querySelector(selector);
  const all = (selector) => [...document.querySelectorAll(selector)];
  let dialogTrigger;
  all('[data-open-dialog]').forEach((button) => button.addEventListener('click', () => {
    dialogTrigger = button;
    const dialog = document.getElementById(button.dataset.openDialog);
    dialog?.showModal();
  }));
  all('[data-close-dialog]').forEach((button) => button.addEventListener('click', () => button.closest('dialog').close()));
  all('dialog').forEach((dialog) => dialog.addEventListener('close', () => dialogTrigger?.focus()));

  if (document.body.dataset.template === 'enterprise-data') {
    const rows = all('[data-request]');
    const selection = () => {
      const visible = rows.filter((row) => !row.hidden);
      const chosen = visible.filter((row) => row.querySelector('input').checked);
      one('[data-batch]').disabled = chosen.length === 0;
      one('[data-batch]').textContent = chosen.length ? `Approve ${chosen.length} selected` : 'Approve selected';
      one('[data-select-all]').checked = visible.length > 0 && chosen.length === visible.length;
      one('[data-select-all]').indeterminate = chosen.length > 0 && chosen.length < visible.length;
      return chosen;
    };
    const filter = () => {
      const term = one('[data-search]').value.trim().toLowerCase();
      const status = one('[data-status-filter]').value;
      rows.forEach((row) => {
        row.hidden = !row.textContent.toLowerCase().includes(term) || (status !== 'all' && row.dataset.state !== status);
        if (row.hidden) row.querySelector('input').checked = false;
      });
      const count = rows.filter((row) => !row.hidden).length;
      one('[data-count]').textContent = `${count} requests shown · local sample data`;
      one('[data-empty]').hidden = count > 0;
      selection();
    };
    one('[data-search]').addEventListener('input', filter);
    one('[data-status-filter]').addEventListener('change', filter);
    rows.forEach((row) => row.querySelector('input').addEventListener('change', selection));
    one('[data-select-all]').addEventListener('change', (event) => {
      rows.filter((row) => !row.hidden).forEach((row) => { row.querySelector('input').checked = event.target.checked; });
      selection();
    });
    one('[data-batch]').addEventListener('click', () => {
      const chosen = selection();
      if (one('[data-failure]').checked) {
        one('[data-feedback]').textContent = 'Approval could not be completed. Your selection is preserved; turn off the failure simulation and retry.';
        one('[data-feedback]').classList.add('error');
        return;
      }
      chosen.forEach((row) => {
        row.dataset.state = 'approved';
        row.querySelector('[data-state-label]').textContent = 'Approved';
        row.querySelector('[data-state-label]').className = 'pill good';
        row.querySelector('input').checked = false;
      });
      one('[data-feedback]').classList.remove('error');
      one('[data-feedback]').textContent = `${chosen.length} request${chosen.length === 1 ? '' : 's'} approved in this preview. No company records changed.`;
      filter();
    });
    let ascending = true;
    one('[data-sort]').addEventListener('click', () => {
      ascending = !ascending;
      const sorted = [...rows].sort((a, b) => (Number(a.dataset.amount) - Number(b.dataset.amount)) * (ascending ? 1 : -1));
      sorted.forEach((row) => one('tbody').append(row));
      one('[data-sort]').textContent = `Amount ${ascending ? '↑' : '↓'}`;
      one('[data-sort]').closest('th').setAttribute('aria-sort', ascending ? 'ascending' : 'descending');
    });
    all('[data-request-detail]').forEach((button) => button.addEventListener('click', () => {
      const row = button.closest('[data-request]');
      one('[data-detail-title]').textContent = row.querySelector('strong').textContent;
      one('[data-detail-owner]').textContent = row.dataset.owner;
      one('[data-detail-amount]').textContent = `$${Number(row.dataset.amount).toLocaleString('en-US')}`;
      one('[data-detail-state]').textContent = row.dataset.state;
    }));
    filter();
  }

  if (document.body.dataset.template === 'marketing-conversion') {
    all('[data-billing]').forEach((button) => button.addEventListener('click', () => {
      const yearly = button.dataset.billing === 'yearly';
      all('[data-billing]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
      all('[data-price]').forEach((price) => { price.textContent = yearly ? price.dataset.yearly : price.dataset.monthly; });
      one('[data-billing-note]').textContent = yearly ? 'Annual billing selected. Prices show the monthly equivalent; paid once a year.' : 'Monthly billing selected. Change or cancel at the end of any month.';
    }));
    one('[data-demo-form]').addEventListener('submit', (event) => {
      event.preventDefault();
      const feedback = one('[data-demo-feedback]');
      if (one('[data-demo-failure]').checked) {
        feedback.textContent = 'This simulated request failed. Your entries are preserved. Turn off the simulation and retry.';
        feedback.classList.add('error');
        return;
      }
      feedback.classList.remove('error');
      feedback.textContent = 'Your preview request is ready. In the real product you would receive a scheduling link. No email was sent.';
    });
  }

  if (document.body.dataset.template === 'commerce-service') {
    let slot = '10:00';
    const update = () => {
      const guests = Number(one('[data-guests]').value);
      one('[data-subtotal]').textContent = `$${guests * 68}`;
      one('[data-total]').textContent = `$${guests * 68 + 8}`;
      one('[data-guest-label]').textContent = `$68 × ${guests} guest${guests === 1 ? '' : 's'}`;
    };
    one('[data-guests]').addEventListener('change', update);
    all('[data-slot]').forEach((button) => button.addEventListener('click', () => {
      slot = button.dataset.slot;
      all('[data-slot]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    }));
    one('[data-save]').addEventListener('click', (event) => {
      const saved = event.currentTarget.getAttribute('aria-pressed') !== 'true';
      event.currentTarget.setAttribute('aria-pressed', String(saved));
      event.currentTarget.textContent = saved ? '♥ Saved for this visit' : '♡ Save experience';
    });
    one('[data-booking-form]').addEventListener('submit', (event) => {
      event.preventDefault();
      const result = one('[data-booking-feedback]');
      if (one('[data-sold-out]').checked) {
        result.textContent = 'That time just filled up in this simulation. Your choices are saved; choose another time and turn off the simulation to retry.';
        result.classList.add('error');
        return;
      }
      result.classList.remove('error');
      result.textContent = `Preview reservation: ${one('[data-booking-date]').selectedOptions[0].textContent}, ${slot}, ${one('[data-guests]').value} guest(s), ${one('[data-total]').textContent} total. Nothing was booked or charged.`;
    });
    update();
  }

  if (document.body.dataset.template === 'brand-editorial') {
    all('[data-project-filter]').forEach((button) => button.addEventListener('click', () => {
      all('[data-project-filter]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
      all('[data-project]').forEach((card) => { card.hidden = button.dataset.projectFilter !== 'all' && card.dataset.project !== button.dataset.projectFilter; });
      one('[data-project-count]').textContent = `${all('[data-project]').filter((card) => !card.hidden).length} projects shown`;
    }));
    all('[data-project-title]').forEach((button) => button.addEventListener('click', () => {
      one('[data-project-dialog-title]').textContent = button.dataset.projectTitle;
      one('[data-project-dialog-copy]').textContent = button.dataset.projectCopy;
    }));
    one('[data-contact-form]').addEventListener('submit', (event) => {
      event.preventDefault();
      one('[data-contact-feedback]').textContent = 'Your brief is ready in this local preview. No message has been sent; the production flow would show a delivery receipt here.';
    });
  }
})();
