import { SkewLoader } from "react-spinners";

export default function Loader() {
    return (
        <SkewLoader 
            color={'#eb0000'} 
            speedMultiplier={2} 
            size={60} 
            cssOverride={{
                animation: 'loader-animation 1s ease-in-out infinite',
                transform: 'rotate(180deg)'
            }}
        />
    )
}
