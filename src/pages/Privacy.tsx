import { motion } from "motion/react";

export default function Privacy() {
  return (
    <div className="pt-[120px] md:pt-32 pb-20 px-6 md:px-[60px]">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-venuea-dark mb-12 tracking-tight">개인정보처리방침</h1>
          
          <div className="space-y-10 text-venuea-muted leading-relaxed font-light">
            <p className="text-sm">베뉴아는 이용자의 개인정보를 소중하게 생각하며, 관련 법령을 준수하여 안전하게 관리하고 있습니다.</p>
            
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-venuea-dark">1. 개인정보 수집항목 및 목적</h2>
              <p>회사는 다음의 목적을 위하여 최소한의 개인정보를 수집합니다.</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>회원 가입 및 관리:</strong> 회원 가입 의사 확인, 본인 식별, 회원자격 유지·관리, 서비스 부정 이용 방지</li>
                <li><strong>재화 또는 서비스 제공:</strong> 물품 배송, 서비스 제공, 계약서·청구서 발송, 콘텐츠 제공, 맞춤 서비스 제공, 본인인증, 연령인증, 요금 결제 및 정산</li>
                <li><strong>마케팅 및 광고 활용 (선택 시):</strong> 신규 서비스 개발 및 맞춤 서비스 제공, 이벤트 및 광고성 정보 제공 및 참여 기회 제공</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-venuea-dark">2. 개인정보의 보유 및 이용기간</h2>
              <p>회사는 법령에 따른 개인정보 보유·이용기간 또는 이용자로부터 개인정보를 수집 시에 동의 받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>전자상거래 등에서의 소비자 보호에 관한 법률에 따른 기록
                  <ul className="list-[circle] pl-5 mt-2 space-y-1">
                    <li>표시/광고에 관한 기록: 6개월</li>
                    <li>계약 또는 청약철회 등에 관한 기록: 5년</li>
                    <li>대금결제 및 재화 등의 공급에 관한 기록: 5년</li>
                    <li>소비자의 불만 또는 분쟁처리에 관한 기록: 3년</li>
                  </ul>
                </li>
                <li>통신비밀보호법에 따른 웹사이트 방문 기록: 3개월</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-venuea-dark">3. 개인정보의 제3자 제공 및 위탁</h2>
              <p>회사는 원활한 서비스 제공을 위해 개인정보 처리 업무를 다음과 같이 외부 전문업체에 위탁하여 운영하고 있습니다.</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>배송 서비스:</strong> [CJ대한통운/우체국택배 등] (상품 배송 업무)</li>
                <li><strong>결제 서비스:</strong> [토스페이먼츠/KG이니시스 등] (결제 처리 및 에스크로 서비스)</li>
                <li><strong>본인인증 서비스:</strong> [NICE평가정보 등] (본인인증)</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-venuea-dark">4. 개인정보의 파기절차 및 방법</h2>
              <p>개인정보는 보유기간이 경과하거나 처리 목적이 달성되면 지체 없이 파기합니다. 전자적 파일 형태는 기록을 재생할 수 없는 기술적 방법을 사용하며, 종이 문서는 분쇄하거나 소각합니다.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-venuea-dark">5. 이용자의 권리와 의무</h2>
              <p>이용자는 언제든지 등록되어 있는 자신의 개인정보를 조회하거나 수정할 수 있으며 가입 해지를 요청할 수 있습니다. 이용자는 자신의 개인정보를 최신 상태로 유지해야 하며, 타인의 정보를 도용하거나 부정확한 정보를 입력하여 발생하는 문제의 책임은 이용자 본인에게 있습니다.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-venuea-dark">6. 개인정보 보호책임자</h2>
              <p>서비스 이용 중 발생하는 모든 개인정보 보호 관련 민원은 아래의 책임자에게 문의하실 수 있습니다.</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>성명:</strong> 김주환</li>
                <li><strong>연락처:</strong> [전화번호 입력]</li>
                <li><strong>이메일:</strong> [이메일 주소 입력]</li>
              </ul>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
