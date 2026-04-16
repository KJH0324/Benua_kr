import { motion } from "motion/react";

export default function About() {
  return (
    <div className="pt-32 pb-20 px-8 md:px-[60px]">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl md:text-6xl font-bold text-venuea-dark mb-12 tracking-tight">브랜드 스토리</h1>
          
          <div className="aspect-video bg-[#F9F9F9] mb-16 overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&q=80&w=1200" 
              alt="Benua Lifestyle" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="space-y-12 text-lg leading-relaxed text-venuea-muted font-light">
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-venuea-dark">🌿 베뉴아(Benua): 일상의 조각들을 모아 완성하는 완벽한 쉼표</h2>
              <p>
                진정한 휴식은 거창한 곳에 있지 않습니다.<br />
                눈을 뜨고 잠드는 침대 위, 차 한 잔을 내려놓는 테이블, 조용히 생각을 정리하는 책상. 우리의 하루를 구성하는 작고 평범한 공간들에 진정한 쉼이 머뭅니다.
              </p>
              <p>
                <strong>베뉴아(Benua)</strong>는 당신의 일상에 스며드는 가장 가까운 사물들을 통해, 나만의 공간을 프리미엄하게 가꾸는 '방꾸미기'의 새로운 기준을 제안합니다.
              </p>
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-bold text-venuea-dark">지친 하루를 감싸 안는 온기, 베뉴아 침구</h3>
              <p>
                가장 무방비해지는 수면의 시간, 피부에 닿는 촉감은 타협할 수 없는 가치입니다. 시각적인 자극은 덜어내고, 본질적인 부드러움과 쾌적함만 남긴 베뉴아의 침구는 당신의 지친 몸과 마음을 조용히 다독이는 첫 번째 위로가 됩니다.
              </p>
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-bold text-venuea-dark">평범한 한 끼를 다이닝으로, 베뉴아 테이블매트</h3>
              <p>
                혼자 먹는 가벼운 식사도, 베뉴아의 정갈한 테이블매트 위에서는 나를 대접하는 근사한 시간이 됩니다. 과하지 않은 미니멀한 디자인은 음식을 돋보이게 하고, 식탁 위에 정돈된 여유를 선사합니다.
              </p>
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-bold text-venuea-dark">생각이 맑아지는 여백, 베뉴아 데스크테리어</h3>
              <p>
                복잡한 일과 속에서 오롯이 나에게 집중하는 시간. 선과 면의 아름다움을 살린 베뉴아의 데스크테리어 용품들은 책상 위의 소음을 지우고, 당신의 시선이 머무는 곳에 고요한 몰입의 감각을 채워줍니다.
              </p>
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-bold text-venuea-dark">공간의 온도를 바꾸는 디테일, 베뉴아 오브제</h3>
              <p>
                아무것도 없는 빈 공간보다, 작지만 확실한 취향이 담긴 소품 하나가 공간의 분위기를 좌우합니다. 정제된 디자인의 작은 액세서리들은 튀지 않으면서도 당신의 방을 갤러리처럼 완성해 주는 마침표가 됩니다.
              </p>
            </div>

            <div className="pt-12 border-t border-venuea-dark/10">
              <p className="text-2xl font-serif italic text-venuea-dark">
                비울수록 깊어지고, 덜어낼수록 선명해집니다.<br />
                당신의 손길이 닿는 모든 곳에 베뉴아를 두세요. 당신의 방은 이제, 세상에서 가장 완벽한 프리미엄 라운지가 됩니다.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
