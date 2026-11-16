// 13-2 새 여행 › 멤버 추가 · 11-3 친구들 › 멤버 추가 (바텀시트, 같은 화면을 같이 써요)
import { html, useState } from '../vendor/preact-htm.js';
import { Avatar, Button, Icon, Sheet, TextField } from '../ui/components.js';
import { closeOverlay } from '../overlay.js';

/**
 * onAdd({ name, relation, profile }) 를 부르고, 성공하면 닫혀요.
 * onAdd가 Promise를 돌려주면 저장이 끝날 때까지 버튼을 막아요.
 */
export function MemberAddSheet({ onAdd, profile, title = '멤버 추가', button = '추가하기' }) {
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('이름을 입력해 주세요.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onAdd({ name: name.trim(), relation: relation.trim(), profile });
      closeOverlay();
    } catch (err) {
      setError(err.message || '저장하지 못했어요. 다시 시도해 주세요.');
      setBusy(false);
    }
  };

  return html`<${Sheet} title=${title}>
    <p class="lead" style="margin-top:-8px">추가하면 이 친구도 초대 링크로 들어와서 자기 프로필을 고를 수 있어요</p>
    <form class="form" style="margin-top:20px" onSubmit=${submit}>
      <div class="member-add__avatar">
        <${Avatar} member=${{ name: name || ' ', profile }} size=${72} />
        <span class="member-add__pencil" aria-hidden="true"><${Icon} name="pencil" size=${14} /></span>
      </div>
      <${TextField}
        title="이름"
        placeholder="예) 도윤"
        value=${name}
        maxLength="20"
        onInput=${(e) => setName(e.currentTarget.value)}
      />
      <${TextField}
        title="간단 소개"
        placeholder="예) 지니의 사촌"
        value=${relation}
        maxLength="30"
        onInput=${(e) => setRelation(e.currentTarget.value)}
      />
      ${error && html`<p class="form__error" role="alert">${error}</p>`}
      <${Button} type="submit" disabled=${busy}>${busy ? '저장 중…' : button}<//>
    </form>
  <//>`;
}
