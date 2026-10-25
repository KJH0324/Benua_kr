import React from "react";

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <section className="space-y-3 pt-6 border-t border-venuea-brown/10 first:border-t-0 first:pt-0">
      <h2 className="text-base md:text-lg font-bold text-venuea-dark">{title}</h2>
      <div className="space-y-2.5 text-sm text-venuea-brown/90 leading-relaxed">
        {children}
      </div>
    </section>
  );
}

export default function Privacy() {
  return (
    <div className="pt-[110px] pb-24 px-6 md:px-[60px] max-w-4xl mx-auto">
      <header className="mb-10 space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-venuea-green">
          Privacy Policy
        </p>
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-venuea-dark">
          개인정보처리방침
        </h1>
        <p className="text-xs text-venuea-muted">시행일자: 2026년 10월 21일</p>
      </header>

      <div className="bg-white rounded-2xl p-6 md:p-10 shadow-xs border border-venuea-brown/10 space-y-6">
        <p className="text-sm text-venuea-brown/90 leading-relaxed">
          베뉴아(이하 “회사”라 함)는 「개인정보 보호법」 제30조에 따라 정보주체의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보처리방침을 수립·공개합니다.
        </p>

        <Section title="제1조 (개인정보의 처리 목적)">
          <p>
            회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 「개인정보 보호법」 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
          </p>
          <ol className="list-decimal pl-5 space-y-1.5">
            <li>
              <strong>회원 가입 및 관리:</strong> 회원제 서비스 이용에 따른 본인 확인(이메일 인증 및 소셜 계정 연동), 개인 식별, 불량회원의 부정 이용 방지와 비인가 사용 방지, 가입 의사 확인, 멤버십 등급(BEIGE, GREEN, BLACK, THE BLACK) 산정 및 포인트·쿠폰 혜택 관리, 고지사항 전달, 회원탈퇴 의사 확인
            </li>
            <li>
              <strong>재화 또는 서비스 제공:</strong> 상품 주문 접수, 물품 배송, 대금 결제 및 정산, 주문/배송 조회, 구매확정 및 청약철회(교환·반품·환불) 처리, 전자영수증 및 주문 안내 메일 발송
            </li>
            <li>
              <strong>고객 고충 처리:</strong> 민원인의 신원 확인, 1:1 문의사항 및 주문 연동 확인, 사실조사를 위한 연락·통지, 처리결과 이메일 통보
            </li>
            <li>
              <strong>마케팅 및 뉴스레터 발송 (동의 시):</strong> 신규 오브제 컬렉션 출시 안내, 이벤트 및 프로모션 정보 전달, 뉴스레터 이메일 발송 (수신 동의 회원 및 뉴스레터 구독 신청자에 한함)
            </li>
          </ol>
        </Section>

        <Section title="제2조 (처리하는 개인정보의 항목 및 수집방법)">
          <p>회사는 서비스 제공을 위해 최소한의 개인정보만을 수집하고 있습니다.</p>
          <div className="overflow-x-auto pt-1">
            <table className="w-full text-xs border-collapse border border-venuea-brown/15">
              <thead className="bg-venuea-beige/70 text-venuea-dark">
                <tr>
                  <th className="border border-venuea-brown/15 p-3 text-left w-1/4">구분</th>
                  <th className="border border-venuea-brown/15 p-3 text-left">처리(수집) 항목</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-venuea-brown/10">
                <tr>
                  <td className="border border-venuea-brown/15 p-3 font-bold">일반 회원가입</td>
                  <td className="border border-venuea-brown/15 p-3">
                    [필수] 이메일 주소, 비밀번호(암호화 해시), 성함<br />
                    [선택] 휴대전화번호, 뉴스레터 수신 여부 (※ 회원가입 시 주소는 수집하지 않으며, 주문 또는 마이페이지 설정 시 입력받습니다.)
                  </td>
                </tr>
                <tr>
                  <td className="border border-venuea-brown/15 p-3 font-bold">
                    소셜 로그인 연동<br />(Google, 네이버, 카카오)
                  </td>
                  <td className="border border-venuea-brown/15 p-3">
                    소셜 서비스 고유 식별자(Social ID), 이메일 주소, 이름(또는 닉네임)
                  </td>
                </tr>
                <tr>
                  <td className="border border-venuea-brown/15 p-3 font-bold">상품 주문 및 배송</td>
                  <td className="border border-venuea-brown/15 p-3">
                    [필수] 주문자 및 수령인 성함, 휴대전화번호, 이메일 주소, 배송지 주소(우편번호, 기본주소, 상세주소), 결제수단 및 결제승인 기록, 가상계좌 입금정보(가상계좌 선택 시)
                  </td>
                </tr>
                <tr>
                  <td className="border border-venuea-brown/15 p-3 font-bold">1:1 고객 문의</td>
                  <td className="border border-venuea-brown/15 p-3">
                    성함, 이메일 주소, 문의 유형, 문의 제목 및 본문, 주문번호(배송/교환/환불 문의 시)
                  </td>
                </tr>
                <tr>
                  <td className="border border-venuea-brown/15 p-3 font-bold">자동 수집 항목</td>
                  <td className="border border-venuea-brown/15 p-3">
                    IP 주소, 쿠키(Cookie), 서비스 이용 기록, 접속 로그, 브라우저 및 기기 정보(User-Agent)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="제3조 (개인정보의 처리 및 보유 기간)">
          <ol className="list-decimal pl-5 space-y-1.5">
            <li>
              회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
            </li>
            <li>
              <strong>회원 정보:</strong> 회원 탈퇴 시 지체 없이 파기합니다. (탈퇴 즉시 주문·리뷰 데이터의 회원 식별 연결을 해제하고 쿠폰, 포인트, 위시리스트 및 계정 정보를 삭제합니다.)
            </li>
            <li>
              다만, 「전자상거래 등에서의 소비자보호에 관한 법률」 등 관계 법령의 규정에 의하여 보존할 필요가 있는 경우 회사는 아래와 같이 관계 법령에서 정한 일정한 기간 동안 거래 및 회원 기록을 보관합니다.
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li><strong>계약 또는 청약철회 등에 관한 기록:</strong> 5년 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
                <li><strong>대금결제 및 재화 등의 공급에 관한 기록:</strong> 5년 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
                <li><strong>소비자의 불만 또는 분쟁처리에 관한 기록:</strong> 3년 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
                <li><strong>표시·광고에 관한 기록:</strong> 6개월 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
                <li><strong>웹사이트 및 앱 방문(접속) 기록:</strong> 3개월 (통신비밀보호법)</li>
              </ul>
            </li>
          </ol>
        </Section>

        <Section title="제4조 (개인정보의 제3자 제공)">
          <p>
            회사는 정보주체의 개인정보를 제1조(개인정보의 처리 목적)에서 명시한 범위 내에서만 처리하며, 정보주체의 사전 동의나 법률의 특별한 규정 등 「개인정보 보호법」 제17조 및 제18조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다. 현재 회사는 법령에 따른 경우를 제외하고 외부에 개인정보를 제3자 제공하고 있지 않습니다.
          </p>
        </Section>

        <Section title="제5조 (개인정보 처리업무의 위탁)">
          <p>
            회사는 원활한 서비스 이행과 결제·배송·이메일 안내 처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.
          </p>
          <div className="overflow-x-auto pt-1">
            <table className="w-full text-xs border-collapse border border-venuea-brown/15">
              <thead className="bg-venuea-beige/70 text-venuea-dark">
                <tr>
                  <th className="border border-venuea-brown/15 p-3 text-left w-1/3">수탁업체</th>
                  <th className="border border-venuea-brown/15 p-3 text-left">위탁업무 내용</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-venuea-brown/10">
                <tr>
                  <td className="border border-venuea-brown/15 p-3 font-bold">토스페이먼츠(주)</td>
                  <td className="border border-venuea-brown/15 p-3">
                    신용카드, 간편결제(카카오페이, 네이버페이), 가상계좌 등 전자결제 대행 및 결제 취소·정산 처리
                  </td>
                </tr>
                <tr>
                  <td className="border border-venuea-brown/15 p-3 font-bold">
                    지정 택배사<br />(CJ대한통운, 우체국택배, 한진택배, 로젠택배)
                  </td>
                  <td className="border border-venuea-brown/15 p-3">
                    주문 상품의 배송, 반품 수거 및 운송장 배송추적 서비스 제공
                  </td>
                </tr>
                <tr>
                  <td className="border border-venuea-brown/15 p-3 font-bold">Resend Inc.</td>
                  <td className="border border-venuea-brown/15 p-3">
                    회원가입 인증번호, 주문/출고 확인 안내, 1:1 문의 답변, 뉴스레터 이메일 발송 및 고객센터 수신 메일 처리
                  </td>
                </tr>
                <tr>
                  <td className="border border-venuea-brown/15 p-3 font-bold">Amazon Web Services, Inc. (AWS)</td>
                  <td className="border border-venuea-brown/15 p-3">
                    클라우드 서버 인프라(Lightsail) 운영 및 데이터베이스 보관
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="제6조 (개인정보의 국외 이전에 관한 사항)">
          <p>
            회사는 글로벌 이메일 발송 인프라(Resend Inc.)를 통해 회원가입 인증번호, 주문 안내 및 문의 답변 메일을 발송·수신하고 있으며, 이에 따라 「개인정보 보호법」 제28조의8에 의거하여 아래와 같이 국외 이전 사항을 고지합니다.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li><strong>이전받는 자:</strong> Resend Inc. (support@resend.com)</li>
            <li><strong>이전되는 국가 및 일시·방법:</strong> 미국 및 일본(도쿄 리전 등 클라우드 서버) / 이메일 발송 및 고객 문의 수신 시 암호화된 네트워크(TLS/HTTPS)를 통한 전송</li>
            <li><strong>이전되는 개인정보 항목:</strong> 이메일 주소, 성함, 주문 안내 및 문의 답변 본문 내역</li>
            <li><strong>이전받는 자의 이용 목적 및 보유기간:</strong> 트랜잭션 이메일 발송·수신 및 발송 로그 확인 목적 / 위탁계약 종료 또는 회원 탈퇴 시까지</li>
            <li><strong>거부 방법 및 효과:</strong> 정보주체는 고객센터(support@benua.shop)를 통해 개인정보의 국외 이전을 거부할 수 있습니다. 다만, 필수 이메일 인증 및 주문 안내 메일 발송이 불가하여 회원가입 및 서비스 이용이 제한될 수 있습니다.</li>
          </ul>
        </Section>

        <Section title="제7조 (개인정보의 파기절차 및 파기방법)">
          <ol className="list-decimal pl-5 space-y-1.5">
            <li>
              <strong>파기절차:</strong> 회사는 개인정보 보유기간의 경과, 처리목적 달성, 회원 탈퇴 등 개인정보가 불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다. 법령에 따라 보존해야 하는 경우에는 별도의 분리된 데이터베이스(또는 테이블 영역)에서 법정 보유기간 동안 보관 후 파기합니다.
            </li>
            <li>
              <strong>파기방법:</strong> 전자적 파일 형태로 기록·저장된 개인정보는 기록을 재생할 수 없도록 기술적 방법(영구 삭제 쿼리 및 로우레벨 삭제)을 이용하여 파기하며, 종이 문서에 기록·저장된 개인정보는 분쇄기로 분쇄하거나 소각하여 파기합니다.
            </li>
          </ol>
        </Section>

        <Section title="제8조 (정보주체와 법정대리인의 권리·의무 및 행사방법)">
          <ol className="list-decimal pl-5 space-y-1.5">
            <li>
              정보주체는 회사에 대해 언제든지 개인정보 열람·정정·삭제·처리정지 요구 및 동의 철회(회원탈퇴, 뉴스레터 수신거부) 등의 권리를 행사할 수 있습니다.
            </li>
            <li>
              회원은 스토어 내 [마이페이지]에서 직접 개인정보를 조회·수정하거나 [회원 탈퇴] 버튼을 통해 계정을 즉시 삭제할 수 있으며, 뉴스레터 하단의 [수신거부] 링크를 통해 마케팅 이메일 수신을 언제든 철회할 수 있습니다.
            </li>
            <li>
              권리 행사는 서면, 전자우편(support@benua.shop) 등을 통하여서도 하실 수 있으며 회사는 이에 대해 지체 없이 조치하겠습니다.
            </li>
          </ol>
        </Section>

        <Section title="제9조 (개인정보의 안전성 확보조치)">
          <p>회사는 개인정보의 안전성 확보를 위해 다음과 같은 기술적·관리적 조치를 취하고 있습니다.</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>비밀번호의 암호화:</strong> 회원의 비밀번호는 솔트(Salt)가 적용된 단방향 암호화 알고리즘(scrypt)으로 해싱되어 저장 및 관리되며, 본인만이 알 수 있습니다.
            </li>
            <li>
              <strong>해킹 등에 대비한 기술적 대책:</strong> 전 구간 SSL/TLS(HTTPS) 암호화 통신을 적용하고 있으며, 로그인 및 인증 요청에 대한 속도 제한(Rate Limiting)을 통해 무차별 대입 공격을 차단합니다.
            </li>
            <li>
              <strong>접근권한의 제한 및 2단계 인증(2FA):</strong> 관리자 콘솔 접근 시 보안 키 검증 외에 TOTP 기반 2단계 인증(Google Authenticator)을 의무화하고 있으며, 모든 관리자의 접근 및 작업 내역을 감사 로그로 기록·보관합니다.
            </li>
          </ul>
        </Section>

        <Section title="제10조 (개인정보 자동 수집 장치의 설치·운영 및 거부에 관한 사항)">
          <ol className="list-decimal pl-5 space-y-1.5">
            <li>
              회사는 이용자에게 개별적인 맞춤서비스와 로그인 세션 유지를 제공하기 위해 이용정보를 저장하고 수시로 불러오는 ‘쿠키(Cookie)’ 및 로컬 스토리지를 사용합니다.
            </li>
            <li>
              이용자는 웹 브라우저 옵션을 설정함으로써 모든 쿠키를 허용하거나, 쿠키가 저장될 때마다 확인을 거치거나, 모든 쿠키의 저장을 거부할 수 있습니다. 다만, 쿠키 저장을 거부할 경우 로그인이 필요한 일부 서비스 이용에 어려움이 있을 수 있습니다.
            </li>
          </ol>
        </Section>

        <Section title="제11조 (개인정보 보호책임자 및 권익침해 구제방법)">
          <p>
            회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
          </p>
          <div className="bg-venuea-beige/60 rounded-xl p-4 text-xs space-y-1 text-venuea-brown">
            <p><strong>개인정보 보호책임자:</strong> 강성달 (대표)</p>
            <p><strong>소속 / 상호:</strong> 베뉴아 (Benua)</p>
            <p><strong>문의 이메일:</strong> support@benua.shop</p>
            <p><strong>문의 전화:</strong> 010-9261-8016 (평일 10:00–17:00)</p>
            <p><strong>주소:</strong> 인천광역시 연수구 새말로 154, 307동 602호</p>
          </div>
          <p className="pt-2 text-xs text-venuea-muted">
            기타 개인정보침해에 대한 신고나 상담이 필요하신 경우에는 아래 기관에 문의하시기 바랍니다.
          </p>
          <ul className="list-disc pl-5 text-xs text-venuea-muted space-y-1">
            <li>개인정보분쟁조정위원회 : (국번없이) 1833-6972 (www.kopico.go.kr)</li>
            <li>개인정보침해신고센터 : (국번없이) 118 (privacy.kisa.or.kr)</li>
            <li>대검찰청 : (국번없이) 1301 (www.spo.go.kr)</li>
            <li>경찰청 : (국번없이) 182 (ecrm.cyber.go.kr)</li>
          </ul>
        </Section>

        <Section title="제12조 (개인정보처리방침의 변경)">
          <p>
            이 개인정보처리방침은 2026년 10월 21일부터 적용됩니다. 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
          </p>
        </Section>
      </div>
    </div>
  );
}
