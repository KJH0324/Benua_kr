import { motion } from "motion/react";

export default function Terms() {
  return (
    <div className="pt-32 pb-20 px-8 md:px-[60px]">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-venuea-dark mb-12 tracking-tight">이용약관</h1>
          
          <div className="space-y-10 text-venuea-muted leading-relaxed font-light">
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-venuea-dark">제 1 조 (목적)</h2>
              <p>이 약관은 베뉴아(이하 "회사")가 운영하는 베뉴아 온라인 스토어(이하 "몰")에서 제공하는 인터넷 관련 서비스(이하 "서비스")를 이용함에 있어 사이버 몰과 이용자의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-venuea-dark">제 2 조 (정의)</h2>
              <p>1. "몰"이란 회사가 재화 또는 용역을 이용자에게 제공하기 위하여 컴퓨터 등 정보통신설비를 이용하여 재화 등을 거래할 수 있도록 설정한 가상의 영업장을 말하며, 아울러 사이버몰을 운영하는 사업자의 의미로도 사용합니다.</p>
              <p>2. "이용자"란 "몰"에 접속하여 이 약관에 따라 "몰"이 제공하는 서비스를 받는 회원 및 비회원을 말합니다.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-venuea-dark">제 3 조 (약관 등의 명시와 설명 및 개정)</h2>
              <p>"몰"은 이 약관의 내용과 상호 및 영업소 소재지 주소, 대표자의 성명, 사업자등록번호, 연락처 등을 이용자가 쉽게 알 수 있도록 베뉴아 온라인 스토어의 초기 서비스화면에 게시합니다.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-venuea-dark">제 4 조 (서비스의 제공 및 변경)</h2>
              <p>"몰"은 다음과 같은 업무를 수행합니다.</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>재화 또는 용역에 대한 정보 제공 및 구매계약의 체결</li>
                <li>구매계약이 체결된 재화 또는 용역의 배송</li>
                <li>기타 "몰"이 정하는 업무</li>
              </ul>
            </section>

            <p className="pt-10 text-sm italic">본 약관은 2026년 4월 16일부터 시행됩니다.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
