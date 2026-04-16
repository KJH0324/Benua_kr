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
              <h2 className="text-xl font-bold text-venuea-dark">제1조 (목적)</h2>
              <p>본 약관은 베뉴아(Benua, 이하 "회사")가 운영하는 온라인 쇼핑몰(이하 "몰")에서 제공하는 전자상거래 관련 서비스 및 기타 서비스(이하 "서비스")를 이용함에 있어 "몰"과 이용자의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-venuea-dark">제2조 (용어의 정의)</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>"몰"이란 회사가 재화 또는 용역을 이용자에게 제공하기 위하여 컴퓨터 등 정보통신설비를 이용하여 재화 등을 거래할 수 있도록 설정한 가상의 영업장을 말합니다.</li>
                <li>"이용자"란 "몰"에 접속하여 본 약관에 따라 서비스를 이용하는 회원 및 비회원을 말합니다.</li>
                <li>"회원"이라 함은 "몰"에 회원등록을 한 자로서, 지속적으로 서비스를 이용할 수 있는 자를 말합니다.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-venuea-dark">제3조 (서비스의 중단 및 면책)</h2>
              <ol className="list-decimal pl-5 space-y-2">
                <li>회사는 컴퓨터 등 정보통신설비의 보수점검, 교체 및 고장, 통신의 두절 등의 사유가 발생한 경우에는 서비스의 제공을 일시적으로 중단할 수 있습니다.</li>
                <li>회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.</li>
                <li>회사는 이용자의 귀책사유로 인한 서비스 이용의 장애에 대하여는 책임을 지지 않습니다.</li>
                <li>회사는 이용자가 서비스를 이용하여 기대하는 수익을 얻지 못하거나 상실한 것에 대하여 책임을 지지 않으며, 서비스를 통하여 얻은 자료로 인한 손해 등에 대하여도 책임이 없습니다.</li>
              </ol>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-venuea-dark">제4조 (구매계약 및 결제)</h2>
              <p>이용자는 "몰" 상에서 다음 또는 이와 유사한 방법에 의하여 구매를 신청하며, "몰"은 이용자가 구매신청을 함에 있어서 다음의 각 내용을 알기 쉽게 제공하여야 합니다.</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>재화 등의 검색 및 선택</li>
                <li>성명, 주소, 전화번호, 전자우편주소 등의 입력</li>
                <li>약관 내용, 청약철회권이 제한되는 서비스, 배송료 등의 비용 부담과 관련한 내용에 대한 확인</li>
                <li>결제방법의 선택 및 결제 정보 확인</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-venuea-dark">제5조 (청약철회 및 교환·반품의 제한)</h2>
              <p>이용자는 재화 등을 배송받은 경우 다음 각 호에 해당하는 경우에는 반품 및 교환을 할 수 없습니다.</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>이용자에게 책임 있는 사유로 재화 등이 멸실 또는 훼손된 경우 (다만, 내용을 확인하기 위하여 포장 등을 훼손한 경우는 제외)</li>
                <li>이용자의 사용 또는 일부 소비에 의하여 재화 등의 가치가 현저히 감소한 경우</li>
                <li>시간의 경과에 의하여 재판매가 곤란할 정도로 재화 등의 가치가 현저히 감소한 경우</li>
                <li>복제가 가능한 재화 등의 포장을 훼손한 경우</li>
                <li>주문제작 상품 등 반품 시 회사에 회복할 수 없는 손해가 예상되는 경우</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-venuea-dark">제6조 (기타 면책 사항)</h2>
              <ol className="list-decimal pl-5 space-y-2">
                <li>회사는 "몰"에 연결된 다른 웹사이트가 독자적으로 제공하는 재화 등에 의하여 이용자와 행하는 거래에 대해서 보증 책임을 지지 않습니다.</li>
                <li>회사는 이용자가 게시판 등에 게재한 정보, 자료, 사실의 신뢰도, 정확성 등 내용에 관하여는 책임을 지지 않습니다.</li>
                <li>회사는 이용자 상호간 또는 이용자와 제3자 상호간에 서비스를 매개로 하여 거래 등을 한 경우에는 책임이 면제됩니다.</li>
              </ol>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
