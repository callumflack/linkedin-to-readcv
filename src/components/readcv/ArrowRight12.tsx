const ArrowRight12 = (props: { fill?: string }) => {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M2 6C2 5.72386 2.22386 5.5 2.5 5.5H8.293L6.646 3.854C6.451 3.658 6.451 3.342 6.646 3.146C6.842 2.951 7.158 2.951 7.354 3.146L9.854 5.646C10.049 5.842 10.049 6.158 9.854 6.354L7.354 8.854C7.158 9.049 6.842 9.049 6.646 8.854C6.451 8.658 6.451 8.342 6.646 8.146L8.293 6.5H2.5C2.22386 6.5 2 6.27614 2 6Z"
        fill={props.fill ?? "#111"}
      />
    </svg>
  );
};

export default ArrowRight12;
