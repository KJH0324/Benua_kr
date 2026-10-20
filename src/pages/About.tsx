import { Link } from "react-router-dom";

const VALUES = [
  {
    title: "여운과 쉼",
    body: "문을 닫은 뒤에도 방이 조금 더 조용하기를 바랍니다.",
  },
  {
    title: "스며드는 편안함",
    body: "거창한 인테리어 대신, 손이 가는 자리에 맞게 둡니다.",
  },
  {
    title: "정갈함",
    body: "필요한 것만 남기고, 두고 봐도 정돈된 형태를 고릅니다.",
  },
];

export default function About() {
  return (
    <div className="pt-[110px] pb-0">
      <article className="px-6 md:px-[60px] max-w-3xl mx-auto py-16 space-y-8">
        <p className="text-sm text-venuea-green font-bold">브랜드 스토리</p>
        <h1 className="text-3xl md:text-5xl font-serif font-bold text-venuea-dark leading-tight">
          문을 닫는 순간,
          <br />
          하루가 조용해지도록
        </h1>
        <div className="space-y-6 text-[17px] leading-[2.1] text-venuea-brown">
          <p>
            알림과 일정으로 시끄러운 하루를 밖에서 보내고, 문을 닫고 나서야 집이 내 편이 됩니다. 베뉴아는 그 짧은 시간을 위해 작은 공간의 소품을 고릅니다.
          </p>
          <p>
            집을 갤러리로 바꿀 필요는 없습니다. 원룸이어도, 둘이 사는 집이어도, 손이 자주 가는 자리와 눈이 쉬는 자리에 하나를 두는 것으로 충분합니다.
          </p>
          <p>
            주력은 감성 소품과 수납용품입니다. 쓰기 편하고, 며칠이 지나도 질리지 않는지를 기준으로 봅니다.
          </p>
          <p>
            바쁜 하루의 끝이 다시 쉴 곳이 되기를 바랍니다. 베뉴아는 그 방에 조용히 남는 물건을 두고 싶습니다.
          </p>
        </div>
      </article>

      <section className="px-6 md:px-[60px] max-w-5xl mx-auto pb-16 grid grid-cols-1 md:grid-cols-3 gap-4">
        {VALUES.map((item) => (
          <div key={item.title} className="bg-white rounded-2xl p-6 space-y-2">
            <h2 className="text-base font-bold text-venuea-dark">{item.title}</h2>
            <p className="text-sm leading-relaxed text-venuea-muted">{item.body}</p>
          </div>
        ))}
      </section>

      <section className="bg-venuea-green text-[#faf2e7] px-6 md:px-[60px] py-16 text-center space-y-4">
        <p className="text-xl md:text-2xl font-serif leading-relaxed">
          오늘도 수고한 당신의 집이,
          <br />
          가장 다정한 쉼이 되기를.
        </p>
        <p className="text-sm text-[#faf2e7]/80">soft living mood, 베뉴아.</p>
        <Link
          to="/shop"
          className="inline-flex bg-[#faf2e7] text-venuea-green px-6 py-3 rounded-full text-sm font-bold"
        >
          컬렉션 보기
        </Link>
      </section>
    </div>
  );
}
