import { motion } from "motion/react";

export default function Privacy() {
  return (
    <div className="pt-32 pb-20 px-8 md:px-[60px]">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-venuea-dark mb-12 tracking-tight">개인정보처리방침</h1>
          
          <div className="space-y-10 text-venuea-muted leading-relaxed font-light">
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-venuea-dark">1. 개인정보의 수집 및 이용 목적</h2>
              <p>회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>홈페이지 회원 가입 및 관리</li>
                <li>재화 또는 서비스 제공 (물품배송, 서비스 제공, 청구서 발송, 콘텐츠 제공 등)</li>
                <li>마케팅 및 광고에의 활용</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-venuea-dark">2. 개인정보의 처리 및 보유기간</h2>
              <p>회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의 받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-venuea-dark">3. 정보주체의 권리·의무 및 행사방법</h2>
              <p>이용자는 개인정보주체로서 언제든지 개인정보 열람·정정·삭제·처리정지 요구 등의 권리를 행사할 수 있습니다.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-venuea-dark">4. 처리하는 개인정보 항목</h2>
              <p>회사는 다음의 개인정보 항목을 처리하고 있습니다.</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>성명, 생년월일, 아이디, 비밀번호, 주소, 전화번호, 이메일주소, 신용카드번호, 은행계좌번호 등</li>
              </ul>
            </section>

            <p className="pt-10 text-sm italic">본 방침은 2026년 4월 16일부터 시행됩니다.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
