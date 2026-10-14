/* The catalog is rendered in HTML so file:// works without fetch or a server. */
(() => {
  const one = (selector) => document.querySelector(selector);
  const all = (selector) => [...document.querySelectorAll(selector)];
  let selected;
  const filter = () => {
    const term = one('[data-library-search]').value.trim().toLowerCase();
    const platform = one('[data-library-platform]').value;
    let visible = 0;
    all('[data-gallery-template]').forEach((card) => {
      card.hidden = !card.dataset.search.toLowerCase().includes(term) || (platform !== 'all' && !card.dataset.platforms.split(' ').includes(platform));
      if (!card.hidden) visible += 1;
    });
    one('[data-visible-count]').textContent = `显示 ${visible} 个模板`;
    one('[data-library-empty]').hidden = visible !== 0;
  };
  const compose = (changed) => {
    const primary = one('[data-primary-reference]').value;
    let auxiliary = all('[data-auxiliary]:checked');
    const repeated = auxiliary.find((item) => item.value === primary);
    if (repeated) repeated.checked = false;
    auxiliary = all('[data-auxiliary]:checked');
    let message = repeated ? '已移除与主视觉重复的辅助参考。' : '';
    if (auxiliary.length > 2) {
      if (changed) changed.checked = false;
      message = '请保留最多两个辅助参考，并写明每个参考的作用范围。';
      auxiliary = all('[data-auxiliary]:checked');
    }
    one('[data-composition-feedback]').textContent = message;
    const scope = one('[data-composition-scope]').value.trim();
    one('[data-composition-result]').value = [
      `主模板：${selected ? `${selected.title} (${selected.id})` : '尚未选择'}`,
      `主视觉：${primary}`,
      `辅助参考：${auxiliary.map((item) => item.value).join(', ') || '无'}`,
      `组合边界：${scope || '待按项目任务与已有 DESIGN 明确'}`,
      '状态：讨论草案；尚未生成或确认当前 change 的 HTML。',
    ].join('\n');
  };
  one('[data-library-search]').addEventListener('input', filter);
  one('[data-library-platform]').addEventListener('change', filter);
  all('[data-choose]').forEach((button) => button.addEventListener('click', () => {
    selected = { id: button.dataset.choose, title: button.dataset.title };
    all('[data-choose]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    one('[data-selection-label]').textContent = `已选择 ${selected.title}。继承项目规则后，确认主视觉与辅助区域。`;
    one('[data-primary-reference]').value = button.dataset.references.split(',')[0];
    all('[data-auxiliary]').forEach((item) => { item.checked = false; });
    compose();
    one('#selection').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    one('[data-primary-reference]').focus({ preventScroll: true });
  }));
  one('[data-primary-reference]').addEventListener('change', () => compose());
  one('[data-composition-scope]').addEventListener('input', () => compose());
  all('[data-auxiliary]').forEach((item) => item.addEventListener('change', () => compose(item)));
  compose();
})();
